const fs = require('fs');

let serverContent = fs.readFileSync('server/server.js', 'utf-8');
const modelInjectionPoint = `require('./models/Voucher');`;
if (!serverContent.includes('QurbaniSkin')) {
  serverContent = serverContent.replace(
    modelInjectionPoint,
    `${modelInjectionPoint}\nrequire('./models/QurbaniSkin');\nrequire('./models/FundTransfer');`
  );
}

const routeInjectionPoint = `const auditLogRoutes = require('./routes/auditLog');`;
if (!serverContent.includes('madrasahRoutes')) {
  serverContent = serverContent.replace(
    routeInjectionPoint,
    `${routeInjectionPoint}\nconst madrasahRoutes = require('./routes/madrasah');`
  );
}

const appUseInjectionPoint = `app.use('/api/v1/finance', financeRoutes);`;
if (!serverContent.includes('/api/v1/madrasah')) {
  serverContent = serverContent.replace(
    appUseInjectionPoint,
    `${appUseInjectionPoint}\napp.use('/api/v1/madrasah', madrasahRoutes);`
  );
}

fs.writeFileSync('server/server.js', serverContent);
