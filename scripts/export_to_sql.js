/**
 * MongoDB BSON → MySQL SQL Dump Script
 * BSON backup ফাইলগুলো পড়ে MySQL INSERT কোয়েরি তৈরি করে
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BSON } = require('bson');

const BACKUP_DIR = path.join(__dirname, '../../db_backups_extracted/db_backups/annurisl_madrasah');
const OUTPUT_FILE = path.join(__dirname, 'migration.sql');

function readBson(filename) {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) return [];
  const docs = [];
  let offset = 0;
  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    if (size <= 0 || offset + size > buffer.length) break;
    const docBuffer = buffer.slice(offset, offset + size);
    try { docs.push(BSON.deserialize(docBuffer)); } catch (e) {}
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

// Escape string for SQL
function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  let str = String(val);
  str = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return `'${str}'`;
}

let sqlOut = "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n";

function generateSQL(bsonFile, tableName, mapper) {
  const docs = readBson(bsonFile);
  if (!docs.length) return;
  console.log(`Generating SQL for ${tableName}: ${docs.length} records`);
  
  sqlOut += `ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
  // We can use REPLACE INTO to overwrite the corrupted rows (????) with correct text
  for (const doc of docs) {
    try {
      const mapped = mapper(doc);
      if (!mapped) continue;
      const keys = Object.keys(mapped);
      const vals = keys.map(k => escape(mapped[k]));
      
      sqlOut += `REPLACE INTO \`${tableName}\` (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${vals.join(',')});\n`;
    } catch (e) {
      console.error(e);
    }
  }
  sqlOut += "\n";
}

function main() {
  generateSQL('institutions.bson', 'institutions', doc => ({
    _id: toStr(doc._id), name: doc.name||'', code: doc.code||'',
    registrationNumber: doc.registrationNumber||'', email: doc.email||'',
    phone: doc.phone||'', address: doc.address||'', website: doc.website||'',
    logo: doc.logo||'', timezone: doc.timezone||'Asia/Dhaka',
    defaultLanguage: doc.defaultLanguage||'bn', status: doc.status||'active',
    isHomeworkPublic: doc.isHomeworkPublic ? 1 : 0,
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('branches.bson', 'branches', doc => ({
    _id: toStr(doc._id), institution: toStr(doc.institution)||'',
    name: doc.name||'', code: doc.code||'', address: doc.address||'',
    phone: doc.phone||'', email: doc.email||'', head: toStr(doc.head)||null,
    isActive: doc.isActive !== false ? 1 : 0,
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('users.bson', 'users', doc => ({
    _id: toStr(doc._id), username: doc.username||null, email: doc.email||null,
    password: doc.password||'', firstName: doc.firstName||'', lastName: doc.lastName||'',
    phone: doc.phone||'', userType: doc.userType||'teacher', adminRole: doc.adminRole||'',
    photo: doc.photo||'', institution: toStr(doc.institution)||null,
    branch: toStr(doc.branch)||null, isActive: doc.isActive !== false ? 1 : 0,
    dbResetPassword: doc.dbResetPassword||'0000',
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('classlevels.bson', 'classlevels', doc => ({
    _id: toStr(doc._id), institution: toStr(doc.institution)||null,
    branch: toStr(doc.branch)||null, name: doc.name||'', code: doc.code||'',
    order: doc.order||doc.order_num||0, educationStream: doc.educationStream||'general',
    isActive: doc.status === 'active' || doc.isActive ? 1 : 0,
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('subjects.bson', 'subjects', doc => ({
    _id: toStr(doc._id), institution: toStr(doc.institution)||null,
    name: (doc.name||'').substring(0, 255), code: doc.code||'',
    subjectType: doc.subjectType||'regular',
    isHifzSubject: doc.isHifzSubject ? 1 : 0,
    classLevels: doc.classLevel ? JSON.stringify([toStr(doc.classLevel)]) : JSON.stringify([]),
    status: doc.status||'active',
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('teachers.bson', 'teachers', doc => ({
    _id: toStr(doc._id), user: toStr(doc.user)||null,
    institution: toStr(doc.institution)||null, branch: toStr(doc.branch)||null,
    employeeId: doc.employeeId||`TCH-${Date.now()}`,
    teacherType: doc.teacherType||'regular',
    qualification: doc.qualification||'', specialization: doc.specialization||'',
    joiningDate: toDate(doc.joiningDate)||now, status: doc.status||'active',
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('homeworks.bson', 'homeworks', doc => ({
    _id: toStr(doc._id), institution: toStr(doc.institution)||null,
    classLevel: toStr(doc.classLevel)||null,
    section: toStr(doc.section)||null, subject: toStr(doc.subject)||null,
    title: (doc.title||'').substring(0, 250),
    description: doc.description||'',
    assignDate: toDate(doc.assignDate)||now, dueDate: toDate(doc.dueDate)||null,
    status: doc.status||'active', assignedBy: toStr(doc.assignedBy)||null,
    attachments: doc.fileUrl ? JSON.stringify([doc.fileUrl]) : (doc.attachments ? JSON.stringify(doc.attachments) : JSON.stringify([])),
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));

  generateSQL('rolepermissions.bson', 'rolepermissions', doc => ({
    _id: toStr(doc._id), role: doc.role||'',
    permissions: doc.permissions ? JSON.stringify(doc.permissions) : '{}',
    createdAt: toDate(doc.createdAt)||now, updatedAt: toDate(doc.updatedAt)||now,
  }));
  
  sqlOut += "SET FOREIGN_KEY_CHECKS = 1;\n";

  fs.writeFileSync(OUTPUT_FILE, sqlOut);
  console.log(`Saved SQL to ${OUTPUT_FILE}`);
}

main();
