const path = require('path');
const cfg = require('../config.json');
const tool = require('../utils/tool');
const scTool = require('../utils/scTool');
const contractAddress = require('../contractAddress');

const txDataDir = tool.getOutputPath('txData');

async function buildDependency(privateKey) {
  let contract, txData;

  let adminNonce = tool.getNonce('admin');

  if (typeof(privateKey) == 'string') { // role
    privateKey = tool.getPrivateKey(privateKey);
  }  

  let tmProxyAddress = contractAddress.getAddress('TokenManagerProxy');
  let tmDelegateAddress = contractAddress.getAddress('TokenManagerDelegate');
  let htlcProxyAddress = contractAddress.getAddress('HTLCProxy');
  let htlcDelegateAddress = contractAddress.getAddress('HTLCDelegate');
  let smgProxyAddress = contractAddress.getAddress('StoremanGroupProxy')
  let smgDelegateAddress = contractAddress.getAddress('StoremanGroupDelegate');
 
  /* 
   * build TokenManager dependency
   */

  // TokenManagerProxy
  contract = await scTool.getDeployedContract('TokenManagerProxy', tmProxyAddress);
  txData = await contract.methods.upgradeTo(tmDelegateAddress).encodeABI();
  scTool.serializeTx(txData, adminNonce++, tmProxyAddress, '0', path.join(txDataDir, "setTokenManagerImp.dat"), privateKey);
  contract = await scTool.getDeployedContract('TokenManagerDelegate', tmProxyAddress);
  txData = await contract.methods.setHtlcAddr(htlcProxyAddress).encodeABI();
  scTool.serializeTx(txData, adminNonce++, tmProxyAddress, '0', path.join(txDataDir, "setTokenManagerHtlc.dat"), privateKey);

  /* 
   * build htlc dependency
   */

   // HTLCProxy
   contract = await scTool.getDeployedContract('HTLCProxy', htlcProxyAddress);
   txData = await contract.methods.upgradeTo(htlcDelegateAddress).encodeABI();
   scTool.serializeTx(txData, adminNonce++, htlcProxyAddress, '0', path.join(txDataDir, "setHTLCImp.dat"), privateKey);
   contract = await scTool.getDeployedContract('HTLCDelegate', htlcProxyAddress);
   txData = await contract.methods.setEconomics(tmProxyAddress, smgProxyAddress, cfg.htlcRatio).encodeABI();
   scTool.serializeTx(txData, adminNonce++, htlcProxyAddress, '0', path.join(txDataDir, "setHTLCEconomics.dat"), privateKey);

  /*
   *  build StoremanGroupAdmin dependency
   */

  // StoremanGroupProxy
  contract = await scTool.getDeployedContract('StoremanGroupProxy', smgProxyAddress);
  txData = await contract.methods.upgradeTo(smgDelegateAddress).encodeABI();
  scTool.serializeTx(txData, adminNonce++, smgProxyAddress, '0', path.join(txDataDir, "setStoremanGroupAdminImp.dat"), privateKey);
  contract = await scTool.getDeployedContract('StoremanGroupDelegate', smgProxyAddress);
  txData = await contract.methods.setDependence(tmProxyAddress, htlcProxyAddress).encodeABI();
  scTool.serializeTx(txData, adminNonce++, smgProxyAddress, '0', path.join(txDataDir, "setStoremanGroupAdminDependency.dat"), privateKey);

  // update admin nonce
  tool.updateNonce('admin', adminNonce);
}

if (cfg.mode == 'release') {
  buildDependency('admin'); // role or privateKey
} else { // 'debug'
  buildDependency(new Buffer.from(cfg.debug['admin'].privateKey, 'hex'));
}