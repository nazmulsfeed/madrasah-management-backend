/**
 * MongoDB BSON → MySQL Import Script
 * BSON backup ফাইলগুলো পড়ে MySQL-এ import করে
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BSON } = require('bson');

// ===== CONFIG =====
const BACKUP_DIR = path.join(__dirname, '../../db_backups_extracted/db_backups/annurisl_madrasah');

// ===== BSON পড়ার ফাংশন =====
function readBson(filename) {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) { console.log(`⚠️ ফাইল নেই: ${filename}`); return []; }
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) { console.log(`⚠️ খালি ফাইল: ${filename}`); return []; }
  const docs = [];
  let offset = 0;
  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    if (size <= 0 || offset + size > buffer.length) break;
    const docBuffer = buffer.slice(offset, offset + size);
    try { docs.push(BSON.deserialize(docBuffer)); } catch (e) { console.error(`BSON parse error:`, e.message); }
    offset += size;
  }
  return docs;
}

function toStr(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._bsontype === 'ObjectId' || val._bsontype === 'ObjectID') return val.toString();
  return String(val);
}

function toDate(val) {
  if (!val) return null;
  try { return new Date(val).toISOString().slice(0, 19).replace('T', ' '); } catch { return null; }
}

const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
const mysql = require('mysql2/promise');

async function getConn() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'annurisl_madrasah',
    charset: 'utf8mb4',
  });
}

async function importTable(conn, bsonFile, tableName, mapper) {
  const docs = readBson(bsonFile);
  if (!docs.length) return;
  console.log(`\n📥 ${tableName}: ${docs.length} রেকর্ড`);
  let ok = 0, skip = 0;
  for (const doc of docs) {
    try {
      const mapped = mapper(doc);
      if (!mapped) { skip++; continue; }
      const id = mapped._id;
      const [rows] = await conn.execute(`SELECT _id FROM \`${tableName}\` WHERE _id=?`, [id]);
      if (rows.length > 0) { skip++; continue; }
      const keys = Object.keys(mapped);
      const vals = keys.map(k => mapped[k]);
      const placeholders = keys.map(() => '?').join(',');
      await conn.execute(`INSERT INTO \`${tableName}\` (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${placeholders})`, vals);
      ok++;
    } catch (e) {
      console.error(`  ❌ Error:`, e.message.substring(0, 120));
      skip++;
    }
  }
  console.log(`  ✅ ${ok} import, ${skip} skip`);
}

async function main() {
  console.log('🚀 MongoDB BSON → MySQL Migration শুরু হচ্ছে...');
  const conn = await getConn();
  console.log('✅ Database সংযুক্ত হয়েছে\n');

  try {
    await importTable(conn, 'institutions.bson', 'institutions', doc => ({
      _id: toStr(doc._id), name: doc.name||'', code: doc.code||'',
      registrationNumber: doc.registrationNumber||'', email: doc.email||'',
      phone: doc.phone||'', address: doc.address||'', website: doc.website||'',
      logo: doc.logo||'', timezone: doc.timezone||'Asia/Dhaka',
      defaultLanguage: doc.defaultLanguage||'bn', status: doc.status||'active',
      isHomeworkPublic: doc.isHomeworkPublic ? 1 : 0,
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'branches.bson', 'branches', doc => ({
      _id: toStr(doc._id), institution: toStr(doc.institution)||'',
      name: doc.name||'', code: doc.code||'', address: doc.address||'',
      phone: doc.phone||'', email: doc.email||'', head: toStr(doc.head)||null,
      isActive: doc.isActive !== false ? 1 : 0,
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'users.bson', 'users', doc => ({
      _id: toStr(doc._id), username: doc.username||null, email: doc.email||null,
      password: doc.password||'', firstName: doc.firstName||'', lastName: doc.lastName||'',
      phone: doc.phone||'', userType: doc.userType||'teacher', adminRole: doc.adminRole||'',
      photo: doc.photo||'', institution: toStr(doc.institution)||null,
      branch: toStr(doc.branch)||null, isActive: doc.isActive !== false ? 1 : 0,
      dbResetPassword: doc.dbResetPassword||'0000',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'classlevels.bson', 'classlevels', doc => ({
      _id: toStr(doc._id), institution: toStr(doc.institution)||null,
      branch: toStr(doc.branch)||null, name: doc.name||'', arabicName: doc.arabicName||'',
      order_num: doc.order||doc.order_num||0, educationStream: doc.educationStream||'general',
      status: doc.status||'active',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'subjects.bson', 'subjects', doc => ({
      _id: toStr(doc._id), institution: toStr(doc.institution)||null,
      name: (doc.name||'').substring(0, 255), code: doc.code||'',
      subjectType: doc.subjectType||'regular',
      isHifzSubject: doc.isHifzSubject ? 1 : 0,
      classLevels: doc.classLevel ? JSON.stringify([toStr(doc.classLevel)]) : JSON.stringify([]),
      status: doc.status||'active',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'teachers.bson', 'teachers', doc => ({
      _id: toStr(doc._id), user: toStr(doc.user)||null,
      institution: toStr(doc.institution)||null, branch: toStr(doc.branch)||null,
      employeeId: doc.employeeId||`TCH-${Date.now()}`,
      teacherType: doc.teacherType||'regular', designation: doc.designation||'',
      qualification: doc.qualification||'', specialization: doc.specialization||'',
      joiningDate: toDate(doc.joiningDate)||now, status: doc.status||'active',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'homeworks.bson', 'homeworks', doc => ({
      _id: toStr(doc._id), institution: toStr(doc.institution)||null,
      classLevel: toStr(doc.classLevel)||null,
      section: toStr(doc.section)||null, subject: toStr(doc.subject)||null,
      title: (doc.title||'').substring(0, 250),
      description: doc.description||'',
      assignDate: toDate(doc.assignDate)||now, dueDate: toDate(doc.dueDate)||null,
      status: doc.status||'active', assignedBy: toStr(doc.assignedBy)||null,
      attachments: doc.fileUrl||doc.attachments||'',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    await importTable(conn, 'rolepermissions.bson', 'rolepermissions', doc => ({
      _id: toStr(doc._id), role: doc.role||'',
      permissions: doc.permissions ? JSON.stringify(doc.permissions) : '{}',
      createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
    }));

    console.log('\n🎉 সব import সম্পন্ন!');
  } catch (e) {
    console.error('❌ Fatal error:', e.message);
  } finally {
    await conn.end();
  }
}

main();
