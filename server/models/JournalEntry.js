const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class JournalEntry extends Model {
  toJSON() {
    const values = { ...this.get() };
    if (typeof values.entries === 'string') {
      try { values.entries = JSON.parse(values.entries); } catch (e) {}
    }
    return values;
  }
}

JournalEntry.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  reference: {
    type: DataTypes.STRING, // Invoice No, Voucher No, etc.
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Store entries as JSON string in MySQL for simplicity, contains array of { account: accountId, debit: amount, credit: amount }
  entries: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('entries');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('entries', JSON.stringify(value));
    }
  },
}, {
  sequelize,
  modelName: 'JournalEntry',
  tableName: 'journal_entries',
});

JournalEntry.associate = function(models) {
};

module.exports = JournalEntry;
