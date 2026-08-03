const { Model, Op } = require('sequelize');

function mapQuery(mongoQuery) {
  if (!mongoQuery) return {};
  const sequelizeQuery = {};
  
  Object.keys(mongoQuery).forEach(key => {
    let val = mongoQuery[key];
    const mappedKey = (key === 'id') ? '_id' : key;
    
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val instanceof RegExp) {
        sequelizeQuery[mappedKey] = { [Op.like]: `%${val.source}%` };
        return;
      }
      
      const subQuery = {};
      Object.keys(val).forEach(op => {
        const opVal = val[op];
        if (op === '$in') subQuery[Op.in] = opVal;
        else if (op === '$nin') subQuery[Op.notIn] = opVal;
        else if (op === '$gte') subQuery[Op.gte] = opVal;
        else if (op === '$lte') subQuery[Op.lte] = opVal;
        else if (op === '$gt') subQuery[Op.gt] = opVal;
        else if (op === '$lt') subQuery[Op.lt] = opVal;
        else if (op === '$ne') subQuery[Op.ne] = opVal;
        else if (op === '$regex') {
          const cleanRegex = typeof opVal === 'string' ? opVal : opVal.source;
          subQuery[Op.like] = `%${cleanRegex}%`;
        }
      });
      if (Reflect.ownKeys(subQuery).length > 0) {
        sequelizeQuery[mappedKey] = subQuery;
      }
    } else if (key === '$or') {
      sequelizeQuery[Op.or] = val.map(mapQuery);
    } else if (key === '$and') {
      sequelizeQuery[Op.and] = val.map(mapQuery);
    } else {
      sequelizeQuery[mappedKey] = val;
    }
  });
  
  return sequelizeQuery;
}
function applyMongooseUpdates(doc, update) {
  const data = update.$set ? { ...update.$set } : { ...update };
  Object.keys(data).forEach(key => {
    if (!key.startsWith('$')) {
      doc[key] = data[key];
    }
  });

  if (update.$unset) {
    Object.keys(update.$unset).forEach(key => {
      doc[key] = null;
    });
  }

  if (update.$inc) {
    Object.keys(update.$inc).forEach(key => {
      doc[key] = (doc[key] || 0) + update.$inc[key];
    });
  }

  if (update.$push) {
    Object.keys(update.$push).forEach(key => {
      const current = Array.isArray(doc[key]) ? doc[key] : [];
      let val = update.$push[key];
      if (val && val.$each) {
        doc[key] = [...current, ...val.$each];
      } else {
        doc[key] = [...current, val];
      }
    });
  }

  if (update.$addToSet) {
    Object.keys(update.$addToSet).forEach(key => {
      const current = Array.isArray(doc[key]) ? doc[key] : [];
      let val = update.$addToSet[key];
      let toAdd = val && val.$each ? val.$each : [val];
      
      const newArray = [...current];
      toAdd.forEach(item => {
        if (!newArray.some(existing => JSON.stringify(existing) === JSON.stringify(item))) {
          newArray.push(item);
        }
      });
      doc[key] = newArray;
    });
  }

  if (update.$pull) {
    Object.keys(update.$pull).forEach(key => {
      const current = Array.isArray(doc[key]) ? doc[key] : [];
      const pullVal = update.$pull[key];
      doc[key] = current.filter(item => {
        if (typeof pullVal === 'object' && pullVal !== null) {
          if (pullVal.$in) {
            return !pullVal.$in.includes(item);
          }
          let match = true;
          Object.keys(pullVal).forEach(k => {
            if (item[k] !== pullVal[k]) match = false;
          });
          return !match;
        }
        return item !== pullVal;
      });
    });
  }
}

class SequelizeQueryBuilder {
  constructor(model, method, query = {}) {
    this.model = model;
    this.method = method;
    this.options = {
      where: mapQuery(query),
      include: []
    };
  }
  
  populate(path, select) {
    let paths = [];
    if (typeof path === 'string') {
      paths = path.split(/\s+/).filter(Boolean);
    } else if (Array.isArray(path)) {
      paths = path;
    } else if (path && path.path) {
      paths = [path.path];
    }
    
    let attributes = undefined;
    if (typeof select === 'string') {
      attributes = select.split(/\s+/).filter(Boolean);
    } else if (path && path.select) {
      attributes = path.select.split(/\s+/).filter(Boolean);
    }
    
    paths.forEach(p => {
      const assocName = `${p}_populated`;
      if (!this.model.associations[assocName]) {
        let targetModelName = Object.keys(this.model.sequelize.models).find(
          m => m.toLowerCase() === p.toLowerCase()
        );
        if (p === 'teacher') {
          targetModelName = 'User';
        }
        if (targetModelName) {
          const targetModel = this.model.sequelize.models[targetModelName];
          this.model.belongsTo(targetModel, { foreignKey: p, targetKey: '_id', as: assocName });
        }
      }
      if (this.model.associations[assocName]) {
        const assoc = this.model.associations[assocName];
        const includeObj = {
          model: assoc.target,
          as: assocName
        };
        if (attributes) {
          includeObj.attributes = attributes.filter(attr => attr !== 'fullName');
        }
        this.options.include.push(includeObj);
      }
    });
    return this;
  }
  
  sort(sortObj) {
    let order = [];
    if (typeof sortObj === 'string') {
      const fields = sortObj.split(/\s+/).filter(Boolean);
      fields.forEach(f => {
        if (f.startsWith('-')) {
          order.push([f.substring(1), 'DESC']);
        } else {
          order.push([f, 'ASC']);
        }
      });
    } else if (sortObj && typeof sortObj === 'object') {
      Object.keys(sortObj).forEach(key => {
        const dir = sortObj[key] === -1 || sortObj[key] === 'desc' ? 'DESC' : 'ASC';
        order.push([key, dir]);
      });
    }
    if (order.length > 0) {
      this.options.order = order;
    }
    return this;
  }
  
  select(selectObj) {
    if (typeof selectObj === 'string') {
      const fields = selectObj.split(/\s+/).filter(Boolean);
      const exclude = fields.some(f => f.startsWith('-'));
      if (exclude) {
        this.options.attributes = {
          exclude: fields.map(f => f.substring(1))
        };
      } else {
        const includePlus = fields.some(f => f.startsWith('+'));
        if (includePlus) {
          const cleanFields = fields.map(f => f.startsWith('+') ? f.substring(1) : f);
          const allModelAttrs = Object.keys(this.model.rawAttributes);
          this.options.attributes = Array.from(new Set([...allModelAttrs, ...cleanFields]));
        } else {
          this.options.attributes = fields;
        }
      }
    }
    return this;
  }
  
  limit(val) {
    this.options.limit = parseInt(val, 10);
    return this;
  }
  
  skip(val) {
    this.options.offset = parseInt(val, 10);
    return this;
  }
  
  lean() {
    return this;
  }
  
  async exec() {
    // Call the original Sequelize methods to bypass compat loop
    const origMethod = this.method === 'findAll' ? originalFindAll : originalFindOne;
    const result = await origMethod.call(this.model, this.options);
    return result;
  }
  
  then(onfulfilled, onrejected) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

// Preserve original Sequelize methods
const originalFindOne = Model.findOne;
const originalFindAll = Model.findAll;
const originalCount = Model.count;
const originalDestroy = Model.destroy;

function isSequelizeOptions(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const sequelizeKeys = ['where', 'include', 'transaction', 'attributes', 'order', 'limit', 'offset', 'raw', 'group', 'hooks', 'rejectOnEmpty', 'logging', 'lock'];
  return sequelizeKeys.some(key => key in obj);
}

// Attach compatibility methods to Sequelize Model class
Model.find = function(query) {
  if (isSequelizeOptions(query)) {
    return originalFindAll.call(this, query);
  }
  return new SequelizeQueryBuilder(this, 'findAll', query);
};

Model.findOne = function(query) {
  if (isSequelizeOptions(query)) {
    return originalFindOne.call(this, query);
  }
  return new SequelizeQueryBuilder(this, 'findOne', query);
};

Model.findById = function(id) {
  return new SequelizeQueryBuilder(this, 'findOne', { _id: id });
};

Model.countDocuments = function(query) {
  if (isSequelizeOptions(query)) {
    return originalCount.call(this, query);
  }
  const qb = new SequelizeQueryBuilder(this, 'count', query);
  // Custom exec for count
  qb.exec = async function() {
    return await originalCount.call(this.model, this.options);
  };
  return qb;
};

Model.findByIdAndUpdate = async function(id, update, options = {}) {
  const doc = await originalFindOne.call(this, { where: { _id: id } });
  if (!doc) return null;
  applyMongooseUpdates(doc, update);
  await doc.save();
  return doc;
};

Model.findByIdAndDelete = async function(id) {
  const doc = await originalFindOne.call(this, { where: { _id: id } });
  if (!doc) return null;
  await doc.destroy();
  return doc;
};

Model.deleteOne = async function(query) {
  const doc = await originalFindOne.call(this, { where: mapQuery(query) });
  if (!doc) return { deletedCount: 0 };
  await doc.destroy();
  return { deletedCount: 1 };
};

Model.deleteMany = async function(query) {
  const count = await originalDestroy.call(this, { where: mapQuery(query) });
  return { deletedCount: count };
};

Model.updateOne = async function(query, update) {
  const doc = await originalFindOne.call(this, { where: mapQuery(query) });
  if (!doc) return { n: 0, nModified: 0 };
  applyMongooseUpdates(doc, update);
  await doc.save();
  return { n: 1, nModified: 1 };
};

Model.updateMany = async function(query, update) {
  const docs = await originalFindAll.call(this, { where: mapQuery(query) });
  if (!docs || docs.length === 0) return { n: 0, nModified: 0 };
  for (const doc of docs) {
    applyMongooseUpdates(doc, update);
    await doc.save();
  }
  return { n: docs.length, nModified: docs.length };
};

Model.insertMany = async function(arr) {
  return await this.bulkCreate(arr);
};

Model.findOneAndUpdate = async function(query, update, options = {}) {
  let doc = await originalFindOne.call(this, { where: mapQuery(query) });
  if (!doc) {
    if (options.upsert) {
      const data = update.$set ? { ...update.$set } : { ...update };
      doc = await this.create({ ...query, ...data });
      return doc;
    }
    return null;
  }
  applyMongooseUpdates(doc, update);
  await doc.save();
  return doc;
};

Model.findOneAndDelete = async function(query) {
  const doc = await originalFindOne.call(this, { where: mapQuery(query) });
  if (!doc) return null;
  await doc.destroy();
  return doc;
};

Model.bulkWrite = async function(ops) {
  const results = { nInserted: 0, nUpserted: 0, nModified: 0, nRemoved: 0 };
  for (const op of ops) {
    if (op.updateOne) {
      const { filter, update, upsert } = op.updateOne;
      let doc = await originalFindOne.call(this, { where: mapQuery(filter) });
      if (doc) {
        applyMongooseUpdates(doc, update);
        await doc.save();
        results.nModified++;
      } else if (upsert) {
        const data = update.$set ? { ...update.$set } : { ...update };
        await this.create({ ...filter, ...data });
        results.nUpserted++;
      }
    } else if (op.deleteOne) {
      const { filter } = op.deleteOne;
      const count = await originalDestroy.call(this, { where: mapQuery(filter) });
      results.nRemoved += count;
    } else if (op.insertOne) {
      const { document } = op.insertOne;
      await this.create(document);
      results.nInserted++;
    }
  }
  return results;
};

Model.prototype.toObject = function() {
  return this.toJSON();
};

Model.prototype.deleteOne = async function() {
  return await this.destroy();
};

Model.prototype.remove = async function() {
  return await this.destroy();
};