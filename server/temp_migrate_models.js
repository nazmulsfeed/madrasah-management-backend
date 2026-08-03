const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const modelsDir = path.join(__dirname, 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} model files to migrate.`);

files.forEach(file => {
  if (file === 'temp_migrate_models.js') return;
  const filePath = path.join(modelsDir, file);
  const modelName = file.replace('.js', '');
  
  delete require.cache[require.resolve(filePath)];
  
  try {
    const MongooseModel = require(filePath);
    if (!MongooseModel || !MongooseModel.schema) {
      console.log(`Skipping ${file}: Not a valid mongoose model.`);
      return;
    }
    
    const schema = MongooseModel.schema;
    const paths = schema.paths;
    
    const attributes = {};
    const associations = [];
    
    // Explicitly define _id as primary key
    attributes['_id'] = {
      type: 'DataTypes.UUID',
      defaultValue: 'DataTypes.UUIDV4',
      primaryKey: true
    };
    
    Object.keys(paths).forEach(p => {
      if (p === '_id' || p === '__v' || p === 'createdAt' || p === 'updatedAt' || p === 'id') return;
      
      const pathObj = paths[p];
      let typeStr = 'DataTypes.STRING';
      let defaultValue = undefined;
      let allowNull = !pathObj.isRequired;
      let unique = !!pathObj.options.unique;
      
      if (pathObj.instance === 'String') {
        typeStr = 'DataTypes.STRING';
        if (p.toLowerCase().includes('desc') || p.toLowerCase().includes('text') || p.toLowerCase().includes('address') || p.toLowerCase().includes('photo') || p.toLowerCase().includes('logo') || p.toLowerCase().includes('note')) {
          typeStr = 'DataTypes.TEXT';
        }
        if (pathObj.options.default !== undefined) {
          if (typeof pathObj.options.default === 'string') {
            defaultValue = `'${pathObj.options.default}'`;
          }
        }
      } else if (pathObj.instance === 'Number') {
        typeStr = 'DataTypes.INTEGER';
        if (p.toLowerCase().includes('amount') || p.toLowerCase().includes('price') || p.toLowerCase().includes('fee') || p.toLowerCase().includes('mark') || p.toLowerCase().includes('gpa')) {
          typeStr = 'DataTypes.FLOAT';
        }
        if (pathObj.options.default !== undefined) {
          defaultValue = pathObj.options.default;
        }
      } else if (pathObj.instance === 'Boolean') {
        typeStr = 'DataTypes.BOOLEAN';
        if (pathObj.options.default !== undefined) {
          defaultValue = pathObj.options.default;
        }
      } else if (pathObj.instance === 'Date') {
        typeStr = 'DataTypes.DATE';
        if (pathObj.options.default !== undefined) {
          if (pathObj.options.default === Date.now || pathObj.options.default === mongoose.Schema.Types.Date.default) {
            defaultValue = 'DataTypes.NOW';
          }
        }
      } else if (pathObj.instance === 'ObjectID') {
        typeStr = 'DataTypes.UUID';
        const ref = pathObj.options.ref;
        if (ref) {
          associations.push({
            field: p,
            ref: ref
          });
        }
      } else if (pathObj.instance === 'Array') {
        typeStr = 'DataTypes.JSON';
      } else if (pathObj.instance === 'Mixed') {
        typeStr = 'DataTypes.JSON';
      }
      
      attributes[p] = {
        type: typeStr,
        allowNull: allowNull,
      };
      
      if (unique) attributes[p].unique = true;
      if (defaultValue !== undefined) attributes[p].defaultValue = defaultValue;
    });
    
    // Generate code
    let code = `const { Model, DataTypes } = require('sequelize');
`;
    code += `const sequelize = require('../config/db');

`;
    
    // If User model, include bcrypt
    if (modelName === 'User') {
      code += `const bcrypt = require('bcryptjs');

`;
    }
    
    code += `class ${modelName} extends Model {
`;
    
    if (modelName === 'User') {
      code += `  async comparePassword(candidatePassword) {
`;
      code += `    return await bcrypt.compare(candidatePassword, this.password);
`;
      code += `  }
`;
    }
    
    code += `  toJSON() {
`;
    code += `    const values = { ...this.get() };
`;
    if (modelName === 'User') {
      code += `    delete values.password;
`;
    }
    associations.forEach(assoc => {
      code += `    if (values.${assoc.field}_populated) {
`;
      code += `      values.${assoc.field} = values.${assoc.field}_populated;
`;
      code += `      delete values.${assoc.field}_populated;
`;
      code += `    }
`;
    });
    code += `    return values;
`;
    code += `  }
`;
    
    code += `}

`;
    
    code += `${modelName}.init({
`;
    Object.keys(attributes).forEach(attr => {
      const attrObj = attributes[attr];
      code += `  ${attr}: {
`;
      code += `    type: ${attrObj.type},
`;
      if (attrObj.allowNull !== undefined) code += `    allowNull: ${attrObj.allowNull},
`;
      if (attrObj.unique !== undefined) code += `    unique: ${attrObj.unique},
`;
      if (attrObj.defaultValue !== undefined) {
        code += `    defaultValue: ${attrObj.defaultValue},
`;
      }
      code += `  },
`;
    });
    code += `}, {
`;
    code += `  sequelize,
`;
    code += `  modelName: '${modelName}',
`;
    code += `  tableName: '${modelName.toLowerCase()}s',
`;
    code += `});

`;
    
    if (modelName === 'User') {
      code += `User.beforeSave(async (user) => {
`;
      code += `  if (user.changed('password')) {
`;
      code += `    const salt = await bcrypt.genSalt(12);
`;
      code += `    user.password = await bcrypt.hash(user.password, salt);
`;
      code += `  }
`;
      code += `});

`;
    }
    
    code += `${modelName}.associate = function(models) {
`;
    associations.forEach(assoc => {
      code += `  ${modelName}.belongsTo(models.${assoc.ref}, { foreignKey: '${assoc.field}', as: '${assoc.field}_populated' });
`;
    });
    code += `};

`;
    
    code += `module.exports = ${modelName};
`;
    
    fs.writeFileSync(filePath, code);
    console.log(`Successfully migrated ${file}`);
  } catch (err) {
    console.error(`Error migrating ${file}:`, err);
  }
});