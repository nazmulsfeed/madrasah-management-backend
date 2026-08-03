const QurbaniSkin = require('../models/QurbaniSkin');
const FundTransfer = require('../models/FundTransfer');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const ApiResponse = require('../utils/apiResponse');
const mongoose = require('mongoose');

// Helper to get or create fund account UUID
const getFundAccountId = async (fundKey, institution) => {
    const fundMap = {
        'zakat': { name: 'যাকাত তহবিল', code: '3001', type: 'Equity' },
        'fitra': { name: 'ফিতরা তহবিল', code: '3002', type: 'Equity' },
        'sadaqah': { name: 'সদকা/লিল্লাহ তহবিল', code: '3003', type: 'Equity' },
        'yatim': { name: 'এতিম তহবিল', code: '3004', type: 'Equity' },
        'masjid': { name: 'মসজিদ তহবিল', code: '3005', type: 'Equity' },
        'nirman': { name: 'নির্মাণ তহবিল', code: '3006', type: 'Equity' },
        'general': { name: 'সাধারণ তহবিল', code: '3007', type: 'Equity' },
        'cash': { name: 'ক্যাশ ইন হ্যান্ড (Cash in Hand)', code: '1001', type: 'Asset' }
    };
    
    if (!fundMap[fundKey]) return fundKey;
    
    let acc = await Account.findOne({ institution, code: fundMap[fundKey].code });
    if (!acc) {
        acc = await Account.create({
            institution,
            name: fundMap[fundKey].name,
            code: fundMap[fundKey].code,
            type: fundMap[fundKey].type,
            isActive: true
        });
    }
    return acc._id.toString();
};

// --- Fund Management ---
exports.getFundBalances = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    
    // Get UUIDs for funds
    const fundIds = {};
    const fundKeys = ['zakat', 'fitra', 'sadaqah', 'yatim', 'masjid', 'nirman', 'general'];
    for (const key of fundKeys) {
        fundIds[key] = await getFundAccountId(key, institution);
    }
    
    // Fetch all journal entries for the institution
    const allJournals = await JournalEntry.findAll({
      where: { institution }
    });

    const fundBalances = {
      'zakat': 0,
      'fitra': 0,
      'sadaqah': 0,
      'yatim': 0,
      'masjid': 0,
      'nirman': 0,
      'general': 0
    };

    // Calculate balances (Credit - Debit for Equity/Liability funds)
    allJournals.forEach(journal => {
      if (journal.entries && Array.isArray(journal.entries)) {
        journal.entries.forEach(entry => {
          const acc = entry.account;
          
          // Reverse lookup fund key from UUID
          let fundKey = null;
          for (const key of fundKeys) {
              if (fundIds[key] === acc) {
                  fundKey = key;
                  break;
              }
          }
          
          if (fundKey && fundBalances[fundKey] !== undefined) {
            // Funds are Equity, so Credit increases balance, Debit decreases
            fundBalances[fundKey] += (parseFloat(entry.credit || 0) - parseFloat(entry.debit || 0));
          }
        });
      }
    });

    ApiResponse.success(res, fundBalances, 'Fund balances retrieved');
  } catch (error) { next(error); }
};

exports.getFundTransfers = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const transfers = await FundTransfer.findAll({ where: { institution }, order: [['createdAt', 'DESC']] });
    ApiResponse.success(res, transfers, 'Fund transfers retrieved');
  } catch (error) { next(error); }
};

exports.createFundTransfer = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { fromFund, toFund, amount, reason } = req.body;
    
    const _id = new mongoose.Types.ObjectId().toString();
    const transfer = await FundTransfer.create({
      _id,
      institution,
      fromFund,
      toFund,
      amount,
      reason,
      status: 'pending' // requires approval for double entry
    });
    
    ApiResponse.success(res, transfer, 'Fund transfer initiated');
  } catch (error) { next(error); }
};

exports.approveFundTransfer = async (req, res, next) => {
  try {
    const transfer = await FundTransfer.findByPk(req.params.id);
    if (!transfer) return ApiResponse.error(res, 'Transfer not found', 404);
    
    transfer.status = 'approved';
    transfer.approvedBy = req.user.id;
    await transfer.save();
    
    // Post to double entry (Debit fromFund, Credit toFund)
    const jId = new mongoose.Types.ObjectId().toString();
    const date = new Date();
    
    // Get UUIDs for accounts
    const fromFundId = await getFundAccountId(transfer.fromFund, transfer.institution);
    const toFundId = await getFundAccountId(transfer.toFund, transfer.institution);

    // Create one journal entry with two entry lines
    await JournalEntry.create({
      _id: jId,
      institution: transfer.institution,
      date,
      description: transfer.reason || 'Fund Transfer',
      reference: `FUND_TRANS_${transfer._id}`,
      entries: [
        { account: fromFundId, debit: transfer.amount, credit: 0 },
        { account: toFundId, debit: 0, credit: transfer.amount }
      ]
    });

    ApiResponse.success(res, transfer, 'Fund transfer approved');
  } catch (error) { next(error); }
};

// --- Qurbani Skins ---
exports.getQurbaniSkins = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const skins = await QurbaniSkin.findAll({ where: { institution }, order: [['createdAt', 'DESC']] });
    ApiResponse.success(res, skins, 'Qurbani skins retrieved');
  } catch (error) { next(error); }
};

exports.createQurbaniSkin = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const _id = new mongoose.Types.ObjectId().toString();
    const skin = await QurbaniSkin.create({ _id, institution, ...req.body });
    ApiResponse.success(res, skin, 'Qurbani skin record created', 201);
  } catch (error) { next(error); }
};

exports.updateQurbaniSkin = async (req, res, next) => {
  try {
    const skin = await QurbaniSkin.findByPk(req.params.id);
    if (!skin) return ApiResponse.error(res, 'Record not found', 404);
    
    await skin.update(req.body);
    
    // If status changed to sold, deposit money
    if (req.body.status === 'sold' && req.body.soldAmount && req.body.fundAccount) {
        // Create a journal entry for Qurbani skin sale
        const jId = new mongoose.Types.ObjectId().toString();
        // Get UUIDs
        const cashId = await getFundAccountId('cash', skin.institution);
        const fundId = await getFundAccountId(req.body.fundAccount, skin.institution);
        
        await JournalEntry.create({
            _id: jId,
            institution: skin.institution,
            date: req.body.soldDate || new Date(),
            description: `Qurbani Skin Sale (${skin.animalType})`,
            reference: `SKIN_${skin._id}`,
            entries: [
                { account: cashId, debit: req.body.soldAmount, credit: 0 }, 
                { account: fundId, debit: 0, credit: req.body.soldAmount }
            ]
        });
    }

    ApiResponse.success(res, skin, 'Record updated');
  } catch (error) { next(error); }
};
