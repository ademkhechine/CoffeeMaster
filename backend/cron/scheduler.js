const cron = require('node-cron');
const { runDailyStockScan } = require('../services/notificationService');

// Run every day at 7:00 AM
cron.schedule('0 7 * * *', async () => {
  console.log('⏰ Running scheduled stock & expiry scan...');
  await runDailyStockScan();
});

console.log('✅ Cron scheduler initialized.');
