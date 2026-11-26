const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class TeacherSubjectAssignment extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

TeacherSubjectAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    institution: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Multi-tenant institution isolation identifier',
    },
    teacher: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      comment: 'References Teacher._id',
    },
    subject: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      comment: 'References Subject._id',
    },
    classLevel: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      comment: 'References ClassLevel._id',
    },
    section: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      defaultValue: null,
      comment: 'Specific Section._id for sectioned classes, or NULL for sectionless classes',
    },
    sectionScopeKey: {
      type: DataTypes.STRING(50),
      // Stored generated column in MySQL: COALESCE(section, '__CLASS_WIDE__')
      // Handled at database level for bulletproof uniqueness without fake foreign keys
    },
    academicYear: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Explicit academic year, e.g. "2026"',
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'inactive'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Lifecycle state: draft (awaiting approval), active (authorized), inactive (deactivated)',
    },
    assignedBy: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Admin User._id who created the assignment',
    },
    updatedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Admin User._id who last modified the assignment',
    },
    approvedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Admin User._id who approved the draft assignment',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Approval timestamp',
    },
    deactivatedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Admin User._id who deactivated the assignment',
    },
    deactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Deactivation timestamp',
    },
    deactivationReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Audit reason for deactivation',
    },
  },
  {
    sequelize,
    modelName: 'TeacherSubjectAssignment',
    tableName: 'teacher_subject_assignments',
    timestamps: true,
  }
);

TeacherSubjectAssignment.associate = function (models) {
  if (models.Teacher) {
    TeacherSubjectAssignment.belongsTo(models.Teacher, {
      foreignKey: 'teacher',
      targetKey: '_id',
      as: 'teacherProfile',
    });
  }
  if (models.Subject) {
    TeacherSubjectAssignment.belongsTo(models.Subject, {
      foreignKey: 'subject',
      targetKey: '_id',
      as: 'subjectDetails',
    });
  }
  if (models.ClassLevel) {
    TeacherSubjectAssignment.belongsTo(models.ClassLevel, {
      foreignKey: 'classLevel',
      targetKey: '_id',
      as: 'classDetails',
    });
  }
  if (models.Section) {
    TeacherSubjectAssignment.belongsTo(models.Section, {
      foreignKey: 'section',
      targetKey: '_id',
      as: 'sectionDetails',
    });
  }
};

module.exports = TeacherSubjectAssignment;
