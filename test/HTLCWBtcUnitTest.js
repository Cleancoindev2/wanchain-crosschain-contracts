const coinAdmin = artifacts.require('./CoinAdmin.sol');
const HTLCWBTC = artifacts.require('./HTLCWBTC.sol')
const WBTCManager = artifacts.require("./WBTCManager.sol")
const WBTC = artifacts.require("./WBTC.sol")
const StoremanGroupAdmin = artifacts.require("./StoremanGroupAdmin.sol")
require('truffle-test-utils').init()
var BigNumber = require('bignumber.js');
const createKeccakHash = require('keccak');

const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const web3 = global.web3;

const HTLCLockedTime = 40;
const HTLCRevokeFeeRatio = 350;
const GasPrice = 200000000000;
let RATIO_PRECISE = 0;
let wan2CoinRatio;
let txFeeRatio;


let WBTCInstance;
let WBTCManagerInstance;
let StoremanGroupAdminInstance;
let coinAdminInst;
let HTLCWBTCInstance;


let ownerAcc;


let emptyAddress = '0x0000000000000000000000000000000000000000';

let x1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
let x2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
let x3 = '0x0000000000000000000000000000000000000000000000000000000000000003';
let x4 = '0x0000000000000000000000000000000000000000000000000000000000000004';
let x5 = '0x0000000000000000000000000000000000000000000000000000000000000005';
let x6 = '0x0000000000000000000000000000000000000000000000000000000000000006';
let x7 = '0x0000000000000000000000000000000000000000000000000000000000000007';
let x8 = '0x0000000000000000000000000000000000000000000000000000000000000008';
let x9 = '0x0000000000000000000000000000000000000000000000000000000000000009';
let xa = '0x000000000000000000000000000000000000000000000000000000000000000a';
let xb = '0x000000000000000000000000000000000000000000000000000000000000000b';
let xc = '0x000000000000000000000000000000000000000000000000000000000000000c';
let xd = '0x000000000000000000000000000000000000000000000000000000000000000d';

let xHash1 = '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5';
let xHash2 = '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2';
let xHash3 = '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946';
let xHash4 = '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f';
let xHash5 = '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47';
let xHash6 = '0xd1ec675902ef1633427ca360b290b0b3045a0d9058ddb5e648b4c3c3224c5c68';
let xHash7 = '0x48428bdb7ddd829410d6bbb924fdeb3a3d7e88c2577bffae073b990c6f061d08';
let xHash8 = '0x38df1c1f64a24a77b23393bca50dff872e31edc4f3b5aa3b90ad0b82f4f089b6';
let xHash9 = '0x887bf140ce0b6a497ed8db5c7498a45454f0b2bd644b0313f7a82acc084d0027';
let xHasha = '0x81b04ae4944e1704a65bc3a57b6fc3b06a6b923e3c558d611f6a854b5539ec13';
let xHashb = '0xc09322c415a5ac9ffb1a6cde7e927f480cc1d8afaf22b39a47797966c08e9c4b';
let xHashc = '0xa82872b96246dac512ddf0515f5da862a92ecebebcb92537b6e3e73199694c45';
let xHashd = '0x2a3f128306951f1ded174b8803ee1f0df0c6404bbe92682be21fd84accf5d540';


function getHashKey(key){
    let h = createKeccakHash('keccak256');
    let kBuf = new Buffer(key.slice(2), 'hex');
    h.update(kBuf);
    let hashKey = '0x' + h.digest('hex');
    DebugLog.debug('input key:', key);
    DebugLog.debug('input hash key:', hashKey);
    return hashKey;
}

function hexTrip0x(hexs){
    if(0 == hexs.indexOf('0x')){
        return hexs.slice(2);
    }
    return hexs;
}

function generatePrivateKey(){
    let randomBuf;
    do{
        randomBuf = crypto.randomBytes(32);
    }while (!secp256k1.privateKeyVerify(randomBuf));
    return '0x' + randomBuf.toString('hex');
}

async function resetHalted (bHalted) {
    await HTLCWBTCInstance.setHalt(bHalted, {from:ownerAcc});
    assert.equal(await HTLCWBTCInstance.halted(), bHalted, `Failed to setHalt`);
}

async function recoverWBTCManager() {
    await resetHalted(true);
    await HTLCWBTCInstance.setWBTCManager(WBTCManagerInstance.address, {from:ownerAcc});
    await resetHalted(false);

    assert.equal(await HTLCWBTCInstance.wbtcManager(), WBTCManagerInstance.address, `failed to setWBTCManager`);
}

async function recoverStoremanGroupAdmin() {
    await resetHalted(true);
    await HTLCWBTCInstance.setStoremanGroupAdmin(StoremanGroupAdminInstance.address, {from:ownerAcc});
    await resetHalted(false);

    assert.equal(await HTLCWBTCInstance.storemanGroupAdmin(), StoremanGroupAdminInstance.address, `failed to storemanGroupAdmin`);
}



contract('HTLCWBTC', ([miner, recipient, owner, user, storeman]) => {

   ownerAcc = owner;

   before(`init`, async () => {
    /*
       xHash1 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x1), 'hex')).toString('hex');
       console.log('let xhash1= 0x' + xHash1);

       xHash2 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x2), 'hex')).toString('hex');
       console.log('let xhash2=  0x' + xHash2);

       xHash3 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x3), 'hex')).toString('hex');
       console.log('let xhash3=  0x' + xHash3);

       xHash4 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x4), 'hex')).toString('hex');
       console.log('let xhash4= 0x' + xHash4);

       xHash5 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x5), 'hex')).toString('hex');
       console.log('let xhash5= 0x' + xHash5);

       xHash6 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x6), 'hex')).toString('hex');
       console.log('let xhash6= 0x' + xHash6);

       xHash7 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x7), 'hex')).toString('hex');
       console.log('let xhash7= 0x' + xHash7);

       xHash8 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x8), 'hex')).toString('hex');
       console.log('let xhash8= 0x' + xHash8);

       xHash9 = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(x9), 'hex')).toString('hex');
       console.log('let xhash9= 0x' + xHash9);

       xHasha = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(xa), 'hex')).toString('hex');
       console.log('let xhasha= 0x' + xHasha);

       xHashb = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(xb), 'hex')).toString('hex');
       console.log('let xhashb= 0x' + xHashb);

       xHashc = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(xc), 'hex')).toString('hex');
       console.log('let xhashc= 0x' + xHashc);

       xHashd = bitcoin.crypto.sha256(Buffer.from(hexTrip0x(xd), 'hex')).toString('hex');
       console.log('let xhashd= 0x' + xHashd);
    */

       await web3.personal.unlockAccount(owner, 'wanglu', 99999);
       await web3.personal.unlockAccount(storeman, 'wanglu', 99999);
       await web3.personal.unlockAccount(user, 'wanglu', 99999);
       console.log("coin admin set halt");


       coinAdminInst =  await coinAdmin.new({from:owner});

       StoremanGroupAdminInstance = await StoremanGroupAdmin.new({from:owner});

       console.log("set coinAdmin in smgAdmin")
       res = await StoremanGroupAdminInstance.setCoinAdmin(coinAdminInst.address,{from:owner});


       HTLCWBTCInstance = await HTLCWBTC.new({from:owner})

       WBTCManagerInstance = await WBTCManager.new(HTLCWBTCInstance.address,StoremanGroupAdminInstance.address,{from:owner});


       let wbtcAddr = await WBTCManagerInstance.WBTCToken();
       WBTCInstance = WBTC.at(wbtcAddr);
       console.log("wbtcAddr:", wbtcAddr);

       let BTC_ID = 1;
       let ratio = 200000; //1 btc:20 wan,it need to mul the precise 10000
       let defaultMinDeposit = web3.toWei(100);
       let htlcType = 1; //use script

       let wanchainHtlcAddr = HTLCWBTCInstance.address;
       let wanchainTokenAdminAddr = WBTCManagerInstance.address;

       let withdrawDelayTime = (3600*72);
       console.log("initializeCoin:");
       res = await  coinAdminInst.initializeCoin(BTC_ID,
           ratio,
           defaultMinDeposit,
           htlcType,
           null,
           wanchainHtlcAddr,
           wanchainTokenAdminAddr,
           withdrawDelayTime,
           {from:owner,gas:4000000}
       );

       console.log("setCoinPunishReciever");
       await coinAdminInst.setCoinPunishReciever(BTC_ID,owner,{from: owner});

       console.log("set ratio");
       await coinAdminInst.setWToken2WanRatio(BTC_ID,ratio,{from: owner});

       console.log("set whitelist");
       await coinAdminInst.setSmgEnableUserWhiteList(BTC_ID, false, {from: owner});

       console.log("storemanGroupRegister");
       regDeposit = web3.toWei(2000);

       console.log("set halt");
       await coinAdminInst.setHalt(false,{from: owner});
       await StoremanGroupAdminInstance.setHalt(false,{from: owner});

       await WBTCManagerInstance.setHalt(false,{from:owner});

       preBal = web3.fromWei(web3.eth.getBalance(storeman));
       console.log("preBal" + preBal);


       await  StoremanGroupAdminInstance.storemanGroupRegister(BTC_ID,storeman,10,{from:storeman,value:regDeposit,gas:4000000});

       // Reset lockedTime
       await resetHalted(true);
       console.log("initialize group wbtc to set token admin");

       await HTLCWBTCInstance.setWBTCManager(wanchainTokenAdminAddr,{from: owner});

       getTokenAdmin = await  HTLCWBTCInstance.wbtcManager();
       assert.equal(getTokenAdmin,wanchainTokenAdminAddr, 'wanchainTokenAdminAddr not match');

       await HTLCWBTCInstance.setAdmin(StoremanGroupAdminInstance.address,coinAdminInst.address,{from: owner});;

       smgAdminAddr = await  HTLCWBTCInstance.storemanGroupAdmin();
       assert.equal(smgAdminAddr,StoremanGroupAdminInstance.address, 'wanchainTokenAdminAddr not match');


       await HTLCWBTCInstance.setLockedTime(HTLCLockedTime, {from:owner});
       assert.equal((await HTLCWBTCInstance.lockedTime()).toString(10), (HTLCLockedTime).toString(10), "setLockedTime fail");

        // tmp
       // await recoverWBTCManager();
       // await recoverStoremanGroupAdmin();
        // tmp

       // set revoke fee ratio
       await HTLCWBTCInstance.setRevokeFeeRatio(HTLCRevokeFeeRatio, {from:owner});
       assert.equal(await HTLCWBTCInstance.revokeFeeRatio(), HTLCRevokeFeeRatio, `setRecokeFeeRatio fail`);

       // get RATIO_PRECISE
       RATIO_PRECISE = await HTLCWBTCInstance.RATIO_PRECISE();
       wan2CoinRatio = (await coinAdminInst.mapCoinInfo(BTC_ID))[0];
       txFeeRatio = (await StoremanGroupAdminInstance.mapCoinSmgInfo(BTC_ID, storeman))[3];
       console.log(`RATIO_PRECISE`, RATIO_PRECISE);
       console.log(`wan2CoinRatio`, wan2CoinRatio);
       console.log(`txFeeRatio`, txFeeRatio);

       await resetHalted(false);
   });



    ////// btc2wbtcLock
    it(`[HTLCWBTC-T2001]`, async () => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcLock(xHash1, user, web3.toWei(1), {from:storeman});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, 'btc2wbtcLock should fail while in halting');
    });


    it(`[HTLCWBTC-T2003]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcLock(xHash1, user, web3.toWei(1), {from:storeman, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }
        assert.notEqual(retError, undefined, 'btc2wbtcLock should fail while tx.value is not 0');
    });


    it(`[HTLCWBTC-T2007]`, async () => {
        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);

        let ret = await HTLCWBTCInstance.btc2wbtcLock(xHash1, user, web3.toWei(1), {from:storeman});
        assert.web3Event(ret, {
            event: "BTC2WBTCLock",
            args: {
                storeman:storeman,
                wanAddr:user,
                xHash:xHash1,
                value:parseInt(web3.toWei(1))
            }
        }, `btc2wbtcLock failed`);

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].sub(web3.toWei(1)).toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].add(web3.toWei(1)).toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.toString(), "unexcept user token");
    });

    it(`[HTLCWBTC-T2109]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x1, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund can not replace btc2wbtcRefund');
    });

    it('[HTLCWBTC-T2206]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while before HTLC timeout`);
    });

    it(`[HTLCWBTC-T2004]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcLock(xHash1, user, web3.toWei(1), {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcLock should fail while xHash exist already');
    });


    it(`[HTLCWBTC-T2005]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcLock(xHash2, user, 0, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcLock should fail while param.value is 0');
    });


    it(`[HTLCWBTC-T2006]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcLock(xHash2, user, web3.toWei(1000000), {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcLock should fail while storeman quatable value is not enough');
    });



    //////// btc2wbtcRefund


    it(`[HTLCWBTC-T2101]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x1, {from:user, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail while tx.value is not 0');
    });


    it(`[HTLCWBTC-T2102]`, async () => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x1, {from:user});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);
        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail while halted is true');
    });


    it(`[HTLCWBTC-T2104]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x3, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail while xHash doesnt exist');
    });

    it(`[HTLCWBTC-T2105]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x1, {from:owner});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail while sender is not user');
    });

    it(`[HTLCWBTC-T2105-2]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x1, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail while sender is not user');
    });

    it(`[HTLCWBTC-T2106]`, async () => {
        await sleep((HTLCLockedTime+5)*1000);

        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x1, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'btc2wbtcRefund should fail after HTLC timeout');
    });


    it(`[HTLCWBTC-T2107]`, async () => {

        console.log('begin lock');
        let ret = await HTLCWBTCInstance.btc2wbtcLock(xHash3, user, web3.toWei(10), {from:storeman});
        console.log(ret);
        assert.web3Event(ret, {
            event: "BTC2WBTCLock",
            args: {
                storeman:storeman,
                wanAddr:user,
                xHash:xHash3,
                value:parseInt(web3.toWei(10))
            }
        }, `btc2wbtcLock failed`);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);

        ret = await HTLCWBTCInstance.btc2wbtcRefund(x3, {from:user});

        assert.web3Event(ret, {
            event: "BTC2WBTCRefund",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHash3,
                x: x3
            }
        }, `btc2wbtcRefund fail`);

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].add(web3.toWei(10)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].sub(web3.toWei(10)).toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].add(web3.toWei(10)).toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.add(web3.toWei(10)).toString(), "unexcept user token");
    });


///*
    it(`[HTLCWBTC-T2108]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x3, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRefund should fail while repeat`);
    });


    //////// btc2wbtcRevoke

    it(`[HTLCWBTC-T2201]`, async()=> {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:storeman, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, "btc2wbtcRevoke should fail while tx.value is not 0")
    });


    it('[HTLCWBTC-T2202]', async() => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:storeman});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while is halting`);
    });


    it('[HTLCWBTC-T2204]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xb, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while xHash doesnt exist`);
    });


    it('[HTLCWBTC-T2205]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:owner});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while sender is not storeman`);
    });

    it('[HTLCWBTC-T2205]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while sender is not storeman`);
    });


    it('[HTLCWBTC-T2209]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash1, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `wbtc2btcRevoke can not replace btc2wbtcRevoke`);
    });


    it('[HTLCWBTC-T2207]', async() => {
        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);

        let ret = await HTLCWBTCInstance.btc2wbtcRevoke(xHash1, {from:storeman});
        assert.web3Event(ret, {
            event: "BTC2WBTCRevoke",
            args: {
                storeman: storeman,
                xHash: xHash1
            }
        }, `btc2wbtcRevoke fail`);

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].add(web3.toWei(1)).toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].sub(web3.toWei(1)).toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.toString(), "unexcept user token");
    });



    it('[HTLCWBTC-T2208]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(x1, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while repeated`);
    });


    // //////// wbtc2btcLock


    it(`[HTLCWBTC-T2301]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, web3.toWei(1), {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while tx.value is 0');
    })


    it(`[HTLCWBTC-T2302]`, async () => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, web3.toWei(1), {from:user});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while is halting');
    });


    it(`[HTLCWBTC-T2304]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash1, storeman, recipient, web3.toWei(1), {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while xHash exist already');
    });


    it(`[HTLCWBTC-T2305]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, 0, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while param.value is 0');
    });

    it(`[HTLCWBTC-T2306]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, web3.toWei(100000), {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while storeman tokenable value not enough');
    });

    it(`[HTLCWBTC-T2308]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, web3.toWei(1), {from:user, value:web3.toWei(0.00000019)});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcLock should fail while fee is not enough')
    });


    it(`[HTLCWBTC-T2307]`, async () => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);
        console.log("beforeSCToken:", beforeSCToken);

        let beforeUserBalance = await web3.eth.getBalance(user);
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("beforeUserBalance:", beforeUserBalance);
        console.log("beforeSCBalance:", beforeSCBalance);

        let ret = await HTLCWBTCInstance.wbtc2btcLock(xHash4, storeman, recipient, web3.toWei(1), {from:user, value:wbtc2btcLockFee, gasPrice:'0x'+GasPrice.toString(16)});
        console.log(ret);

        assert.web3Event(ret, {
            event: "WBTC2BTCLock",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHash4,
                value: parseInt(web3.toWei(1)),
                userBtcAddr: recipient,
                fee: parseInt(wbtc2btcLockFee)
            }
        })

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);
        console.log("afterSCToken:", afterSCToken);

        let afterUserBalance = await web3.eth.getBalance(user);
        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("afterUserBalance:", afterUserBalance);
        console.log("afterSCBalance:", afterSCBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].sub(web3.toWei(1)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].add(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.sub(web3.toWei(1)).toString(), "unexcept user token");
        assert.equal(afterSCToken.toString(), beforeSCToken.add(web3.toWei(1)).toString(), "unexcept SC token");

        assert.equal(afterUserBalance.toString(), beforeUserBalance.sub(gasPrice.mul(gasUsed)).sub(wbtc2btcLockFee).toString(), "unexpect user balance");
        assert.equal(afterSCBalance.toString(), beforeSCBalance.add(wbtc2btcLockFee).toString(), "unexpect SC balance");
    });

///*

    it(`[HTLCWBTC-T2307-2]`, async () => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

        let ret = await HTLCWBTCInstance.btc2wbtcLock(xHash8, user, web3.toWei(1), {from:storeman});
        assert.web3Event(ret, {
            event: "BTC2WBTCLock",
            args: {
                storeman:storeman,
                wanAddr:user,
                xHash:xHash8,
                value:parseInt(web3.toWei(1))
            }
        }, `btc2wbtcLock failed`);

        ret = await HTLCWBTCInstance.btc2wbtcRefund(x8, {from:user});
        assert.web3Event(ret, {
            event: "BTC2WBTCRefund",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHash8,
                x: x8
            }
        }, `btc2wbtcRefund fail`);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);
        console.log("beforeSCToken:", beforeSCToken);

        let beforeUserBalance = await web3.eth.getBalance(user);
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("beforeUserBalance:", beforeUserBalance);
        console.log("beforeSCBalance:", beforeSCBalance);

        ret = await HTLCWBTCInstance.wbtc2btcLock(xHash9, storeman, recipient, web3.toWei(1), {from:user, value:web3.toWei(30), gasPrice:'0x'+GasPrice.toString(16)});
        assert.web3Event(ret, {
            event: "WBTC2BTCLock",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHash9,
                value: parseInt(web3.toWei(1)),
                userBtcAddr: recipient,
                fee: parseInt(wbtc2btcLockFee)
            }
        })

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);
        console.log("afterSCToken:", afterSCToken);

        let afterUserBalance = await web3.eth.getBalance(user);
        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("afterUserBalance:", afterUserBalance);
        console.log("afterSCBalance:", afterSCBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].sub(web3.toWei(1)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].add(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.sub(web3.toWei(1)).toString(), "unexcept user token");
        assert.equal(afterSCToken.toString(), beforeSCToken.add(web3.toWei(1)).toString(), "unexcept SC token");

        assert.equal(afterUserBalance.toString(), beforeUserBalance.sub(gasPrice.mul(gasUsed)).sub(wbtc2btcLockFee).toString(), "unexpect user balance");
        assert.equal(afterSCBalance.toString(), beforeSCBalance.add(wbtc2btcLockFee).toString(), "unexpect SC balance");
    });


    it(`[HTLCWBTC-T2307-3]`, async () => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);
        console.log("beforeSCToken:", beforeSCToken);

        let beforeUserBalance = await web3.eth.getBalance(user);
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("beforeUserBalance:", beforeUserBalance);
        console.log("beforeSCBalance:", beforeSCBalance);

        let ret = await HTLCWBTCInstance.wbtc2btcLock(xHasha, storeman, recipient, web3.toWei(1), {from:user, value:wbtc2btcLockFee, gasPrice:'0x'+GasPrice.toString(16)});
        assert.web3Event(ret, {
            event: "WBTC2BTCLock",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHasha,
                value: parseInt(web3.toWei(1)),
                userBtcAddr: recipient,
                fee: parseInt(wbtc2btcLockFee)
            }
        })

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);
        console.log("afterSCToken:", afterSCToken);

        let afterUserBalance = await web3.eth.getBalance(user);
        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("afterUserBalance:", afterUserBalance);
        console.log("afterSCBalance:", afterSCBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].sub(web3.toWei(1)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].add(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.sub(web3.toWei(1)).toString(), "unexcept user token");
        assert.equal(afterSCToken.toString(), beforeSCToken.add(web3.toWei(1)).toString(), "unexcept SC token");

        assert.equal(afterUserBalance.toString(), beforeUserBalance.sub(gasPrice.mul(gasUsed)).sub(wbtc2btcLockFee).toString(), "unexpect user balance");
        assert.equal(afterSCBalance.toString(), beforeSCBalance.add(wbtc2btcLockFee).toString(), "unexpect SC balance");
    });


    it('[HTLCWBTC-T2409]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRefund(x4, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRefund can not replace wbtc2btcRefund`);
    });


    it('[HTLCWBTC-T2506]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(x4, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `wbtc2btcRevoke should fail while before HTLC timeout`);
    });



    //////// wbtc2btcRefund

    it(`[HTLCWBTC-T2401]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x4, {from:storeman, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while tx.value is not 0');
    });



    it(`[HTLCWBTC-T2402]`, async () => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x4, {from:storeman});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while halted is true');
    });


    it(`[HTLCWBTC-T2404]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x5, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while xHash does not exist');
    });


    it(`[HTLCWBTC-T2405]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x4, {from:owner});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while sender is not storeman');
    });


    it(`[HTLCWBTC-T2405-2]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x4, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while sender is not storeman');
    });


    it(`[HTLCWBTC-T2406]`, async () => {
        await sleep((HTLCLockedTime*2+5)*1000);

        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x4, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while HTLC timeout already');
    });


    it(`[HTLCWBTC-T2407]`, async () => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

         let ret = await HTLCWBTCInstance.btc2wbtcLock(xHash7, user, web3.toWei(1), {from:storeman});
         assert.web3Event(ret, {
             event: "BTC2WBTCLock",
             args: {
                 storeman:storeman,
                 wanAddr:user,
                 xHash:xHash7,
                 value:parseInt(web3.toWei(1))
             }
         }, `btc2wbtcLock failed`);

         ret = await HTLCWBTCInstance.btc2wbtcRefund(x7, {from:user});
         assert.web3Event(ret, {
             event: "BTC2WBTCRefund",
             args: {
                 wanAddr: user,
                 storeman: storeman,
                 xHash: xHash7,
                 x: x7
             }
         }, `btc2wbtcRefund fail`);

        ret = await HTLCWBTCInstance.wbtc2btcLock(xHash5, storeman, recipient, web3.toWei(1), {from:user, value:web3.toWei(20)});
        assert.web3Event(ret, {
            event: "WBTC2BTCLock",
            args: {
                wanAddr: user,
                storeman: storeman,
                xHash: xHash5,
                value: parseInt(web3.toWei(1)),
                userBtcAddr: recipient,
                fee: parseInt(wbtc2btcLockFee)
            }
        }, `wbtc2btcLock fail`);


        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        let beforeStoremanToken = await WBTCInstance.balanceOf(storeman);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeSCToken:", beforeSCToken);
        console.log("beforeStoremanToken:", beforeStoremanToken);

        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let beforeStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("beforeSCBalance:", beforeSCBalance);
        console.log("beforeStoremanBalance:", beforeStoremanBalance);


        ret = await HTLCWBTCInstance.wbtc2btcRefund(x5, {from:storeman, gasPrice:'0x'+GasPrice.toString(16)});
        assert.web3Event(ret, {
            event: "WBTC2BTCRefund",
            args: {
                storeman: storeman,
                wanAddr: user,
                xHash: xHash5,
                x: x5
            }
        }, `wbtc2btcRefund fail`);

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        let afterStoremanToken = await WBTCInstance.balanceOf(storeman);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterSCToken:", afterSCToken);
        console.log("afterStoremanToken:", afterStoremanToken);

        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let afterStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("afterSCBalance:", afterSCBalance);
        console.log("afterStoremanBalance:", afterStoremanBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].add(web3.toWei(1)).toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].sub(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].sub(web3.toWei(1)).toString(), "unexcept storeman debt");
        assert.equal(afterSCToken.toString(), beforeSCToken.sub(web3.toWei(1)).toString(), "unexcept SC token");
        assert.equal(afterStoremanToken.toString(), beforeStoremanToken.toString(), "unexcept storeman token");

        assert.equal(afterSCBalance.toString(), beforeSCBalance.sub(wbtc2btcLockFee).toString(), "unexpect SC balance");
        assert.equal(afterStoremanBalance.toString(), beforeStoremanBalance.add(wbtc2btcLockFee).sub(gasPrice.mul(gasUsed)).toString(), "unexpect storeman balance");

    });

    it(`[HTLCWBTC-T2408]`, async () => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRefund(x5, {from:storeman});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, 'wbtc2btcRefund should fail while repeated');
    });


    //////// wbtc2btcRevoke

    it(`[HTLCWBTC-T2501]`, async()=> {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash4, {from:user, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, "wbtc2btcRevoke should fail while tx.value is not 0")
    });

    it('[HTLCWBTC-T2502]', async() => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash4, {from:user});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, `wbtc2btcRevoke should fail while is halting`);
    });


    it('[HTLCWBTC-T2504]', async() => {
        await sleep((HTLCLockedTime+5)*1000);
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash6, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke should fail while xHash doesnt exist`);
    });


    it('[HTLCWBTC-T2505]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash4, {from:owner});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `wbtc2btcRevoke should fail while sender is not user`);
    });

    it('[HTLCWBTC-T2510]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.btc2wbtcRevoke(xHash4, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `btc2wbtcRevoke can not replace wbtc2btcRevoke`);
    });


    it('HTLCWBTC-T2507]', async() => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);
        console.log("beforeSCToken:", beforeSCToken);

        let beforeUserBalance = await web3.eth.getBalance(user);
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let beforeStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("beforeUserBalance:", beforeUserBalance);
        console.log("beforeSCBalance:", beforeSCBalance);
        console.log("beforeStoremanBalance:", beforeStoremanBalance);


        let ret = await HTLCWBTCInstance.wbtc2btcRevoke(xHash4, {from:user, gasPrice:'0x'+GasPrice.toString(16)});
        assert.web3Event(ret, {
            event: "WBTC2BTCRevoke",
            args: {
                wanAddr: user,
                xHash: xHash4
            }
        }, `wbtc2btcRevoke fail`)

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);
        console.log("afterSCToken:", afterSCToken);

        let afterUserBalance = await web3.eth.getBalance(user);
        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let afterStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("afterUserBalance:", afterUserBalance);
        console.log("afterSCBalance:", afterSCBalance);
        console.log("afterStoremanBalance:", afterStoremanBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].add(web3.toWei(1)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].sub(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.add(web3.toWei(1)).toString(), "unexcept user token");
        assert.equal(afterSCToken.toString(), beforeSCToken.sub(web3.toWei(1)).toString(), "unexcept SC token");

        let revokeFee = wbtc2btcLockFee.mul(HTLCRevokeFeeRatio).div(RATIO_PRECISE);
        let leftFee = wbtc2btcLockFee.sub(revokeFee);
        let exceptUserBalance = beforeUserBalance.sub(gasPrice.mul(gasUsed)).add(leftFee);
        let exceptStoremanBalance = beforeStoremanBalance.add(revokeFee);
        let exceptSCBalance = beforeSCBalance.sub(wbtc2btcLockFee);
        console.log("revokeFee:", revokeFee);
        console.log("leftFee:", leftFee);
        console.log("exceptUserBalance:", exceptUserBalance);
        console.log("exceptSCBalance:", exceptSCBalance);
        console.log("exceptStoremanBalance:", exceptStoremanBalance);

        assert.equal(afterUserBalance.toString(), exceptUserBalance.toString(), "unexpect user balance");
        assert.equal(afterStoremanBalance.toString(), exceptStoremanBalance.toString(), "unexpect storeman balance");
        assert.equal(afterSCBalance.toString(), exceptSCBalance.toString(), "unexpect SC balance");

    });



    it('HTLCWBTC-T2508]', async() => {
        let wbtc2btcLockFee = wan2CoinRatio.mul(txFeeRatio).mul(web3.toWei(1)).div(RATIO_PRECISE).div(RATIO_PRECISE);

        let beforeStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let beforeUserToken = await WBTCInstance.balanceOf(user);
        let beforeSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("beforeStoremanInfo:", beforeStoremanInfo);
        console.log("beforeUserToken:", beforeUserToken);
        console.log("beforeSCToken:", beforeSCToken);

        let beforeUserBalance = await web3.eth.getBalance(user);
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let beforeStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("beforeUserBalance:", beforeUserBalance);
        console.log("beforeSCBalance:", beforeSCBalance);
        console.log("beforeStoremanBalance:", beforeStoremanBalance);


        let ret = await HTLCWBTCInstance.wbtc2btcRevoke(xHasha, {from:storeman, gasPrice:'0x'+GasPrice.toString(16)});
        assert.web3Event(ret, {
            event: "WBTC2BTCRevoke",
            args: {
                wanAddr: user,
                xHash: xHasha
            }
        }, `wbtc2btcRevoke fail`)

        let afterStoremanInfo = await WBTCManagerInstance.getStoremanGroup(storeman);
        let afterUserToken = await WBTCInstance.balanceOf(user);
        let afterSCToken = await WBTCInstance.balanceOf(HTLCWBTCInstance.address);
        console.log("afterStoremanInfo:", afterStoremanInfo);
        console.log("afterUserToken:", afterUserToken);
        console.log("afterSCToken:", afterSCToken);

        let afterUserBalance = await web3.eth.getBalance(user);
        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let afterStoremanBalance = await web3.eth.getBalance(storeman);
        console.log("afterUserBalance:", afterUserBalance);
        console.log("afterSCBalance:", afterSCBalance);
        console.log("afterStoremanBalance:", afterStoremanBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterStoremanInfo[0].toString(), beforeStoremanInfo[0].toString(), "unexcept storeman quata");
        assert.equal(afterStoremanInfo[1].toString(), beforeStoremanInfo[1].toString(), "unexcept storeman inboundQuata");
        assert.equal(afterStoremanInfo[2].toString(), beforeStoremanInfo[2].add(web3.toWei(1)).toString(), "unexcept storeman outboundQuata");
        assert.equal(afterStoremanInfo[3].toString(), beforeStoremanInfo[3].toString(), "unexcept storeman receivable");
        assert.equal(afterStoremanInfo[4].toString(), beforeStoremanInfo[4].sub(web3.toWei(1)).toString(), "unexcept storeman payable");
        assert.equal(afterStoremanInfo[5].toString(), beforeStoremanInfo[5].toString(), "unexcept storeman debt");
        assert.equal(afterUserToken.toString(), beforeUserToken.add(web3.toWei(1)).toString(), "unexcept user token");
        assert.equal(afterSCToken.toString(), beforeSCToken.sub(web3.toWei(1)).toString(), "unexcept SC token");

        let revokeFee = wbtc2btcLockFee.mul(HTLCRevokeFeeRatio).div(RATIO_PRECISE);
        let leftFee = wbtc2btcLockFee.sub(revokeFee);
        let exceptUserBalance = beforeUserBalance.add(leftFee);
        let exceptStoremanBalance = beforeStoremanBalance.add(revokeFee).sub(gasPrice.mul(gasUsed));
        let exceptSCBalance = beforeSCBalance.sub(wbtc2btcLockFee);
        console.log("revokeFee:", revokeFee);
        console.log("leftFee:", leftFee);
        console.log("exceptUserBalance:", exceptUserBalance);
        console.log("exceptSCBalance:", exceptSCBalance);
        console.log("exceptStoremanBalance:", exceptStoremanBalance);

        assert.equal(afterUserBalance.toString(), exceptUserBalance.toString(), "unexpect user balance");
        assert.equal(afterStoremanBalance.toString(), exceptStoremanBalance.toString(), "unexpect storeman balance");
        assert.equal(afterSCBalance.toString(), exceptSCBalance.toString(), "unexpect SC balance");

    });


    it('[HTLCWBTC-T2509]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.wbtc2btcRevoke(xHash4, {from:user});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `wbtc2btcRevoke should fail while repeated`);
    });


    it('[HTLCWBTC-T2701]', async() => {
        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log("beforeSCBalance:", beforeSCBalance);

        let retError;
        try {
            await HTLCWBTCInstance.sendTransaction({from:storeman, value:web3.toWei(1)});
        } catch (e) {
            retError = e;
        }

        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        console.log(`afterSCBalance:`, afterSCBalance);

        assert.equal(beforeSCBalance.toString(), afterSCBalance.toString(), `SC balance should not be changed`)
        assert.notEqual(retError, undefined, `fallback function should be dispayable`);
    });


    it('[HTLCWBTC-T2702]', async() => {
        await resetHalted(false);

        let retError;
        try {
            await HTLCWBTCInstance.setHalt(true, {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        let afterHalted = await HTLCWBTCInstance.halted();
        console.log(`afterHaled:`, afterHalted);

        assert.equal(false, afterHalted, `halted should not be changed`);
        assert.notEqual(retError, undefined, `setHalt should fail while called by non owner`);
    });

    it('[HTLCWBTC-T2703]', async() => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setHalt(false, {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        let afterHalted = await HTLCWBTCInstance.halted();
        console.log(`afterHaled:`, afterHalted);

        await resetHalted(false);
        assert.equal(true, afterHalted, `halted should not be changed`);
        assert.notEqual(retError, undefined, `setHalt should fail while called by non owner`);
    });


    it('[HTLCWBTC-T2704]', async() => {
        let beforeLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`beforeLockedTime:`, beforeLockedTime);

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setLockedTime(beforeLockedTime.mul(2), {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`afterLockedTime:`, afterLockedTime);

        assert.equal(beforeLockedTime.toString(), afterLockedTime.toString(), `lockedTime should not be changed`);
        assert.notEqual(retError, undefined, `setLockedTime should fail while called by non owner`);
    });

    it('[HTLCWBTC-T2705]', async() => {
        let beforeLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`beforeLockedTime:`, beforeLockedTime);

        let retError;
        try {
            await HTLCWBTCInstance.setLockedTime(beforeLockedTime.mul(2), {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        let afterLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`afterLockedTime:`, afterLockedTime);

        assert.equal(beforeLockedTime.toString(), afterLockedTime.toString(), `lockedTime should not be changed`);
        assert.notEqual(retError, undefined, `setLockedTime should fail while halted is false`);
    });

    it('[HTLCWBTC-T2706]', async() => {
        let beforeLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`beforeLockedTime:`, beforeLockedTime);

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setLockedTime(beforeLockedTime.mul(2), {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterLockedTime = await HTLCWBTCInstance.lockedTime();
        console.log(`afterLockedTime:`, afterLockedTime);

        assert.equal(beforeLockedTime.mul(2).toString(), afterLockedTime.toString(), `lockedTime should be changed`);
        assert.equal(retError, undefined, `setLockedTime fail`);
    });

    it(`[HTLCWBTC-T2707]`, async() => {
        let beforeRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`beforeRevokeFeeRatio:`, beforeRevokeFeeRatio);

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setRevokeFeeRatio(beforeRevokeFeeRatio.add(1), {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`afterRevokeFeeRatio:`, afterRevokeFeeRatio);

        assert.equal(afterRevokeFeeRatio.toString(), beforeRevokeFeeRatio.toString(), `revokeFeeRatio should not be changed`);
        assert.notEqual(retError, undefined, `setRevokeFeeRatio should fail while called by non owner`)
    })

    it(`[HTLCWBTC-T2708]`, async() => {
        let beforeRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`beforeRevokeFeeRatio:`, beforeRevokeFeeRatio);

        await resetHalted(false);

        let retError;
        try {
            await HTLCWBTCInstance.setRevokeFeeRatio(beforeRevokeFeeRatio.add(1), {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(true);

        let afterRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`afterRevokeFeeRatio:`, afterRevokeFeeRatio);

        assert.equal(afterRevokeFeeRatio.toString(), beforeRevokeFeeRatio.toString(), `revokeFeeRatio should not be changed`);
        assert.notEqual(retError, undefined, `setRevokeFeeRatio should fail while halted is false`)
    })

    it(`[HTLCWBTC-T2709]`, async() => {
        let beforeRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`beforeRevokeFeeRatio:`, beforeRevokeFeeRatio);

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setRevokeFeeRatio(beforeRevokeFeeRatio.add(1), {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterRevokeFeeRatio = await HTLCWBTCInstance.revokeFeeRatio();
        console.log(`afterRevokeFeeRatio:`, afterRevokeFeeRatio);

        assert.equal(afterRevokeFeeRatio.toString(), beforeRevokeFeeRatio.add(1).toString(), `revokeFeeRatio should be changed`);
        assert.equal(retError, undefined, `setRevokeFeeRatio fail`)
    })


    it(`[HTLCWBTC-T2710]`, async() => {
        let beforeWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`beforeWbtcManager:`, beforeWbtcManager);
        let newWbtcManager = '0x0000000000000000000000000000000000000011';

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setWBTCManager(newWbtcManager, {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`afterWbtcManager:`, afterWbtcManager);

        assert.equal(beforeWbtcManager, afterWbtcManager, `wbtcManager should not be changed`);
        assert.notEqual(retError, undefined, `setWBTCManager should fail while called by non owner`)
    })

    it(`[HTLCWBTC-T2711]`, async() => {
        let beforeWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`beforeWbtcManager:`, beforeWbtcManager);
        let newWbtcManager = '0x0000000000000000000000000000000000000011';

        let retError;
        try {
            await HTLCWBTCInstance.setWBTCManager(newWbtcManager, {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        let afterWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`afterWbtcManager:`, afterWbtcManager);

        assert.equal(beforeWbtcManager, afterWbtcManager, `wbtcManager should not be changed`);
        assert.notEqual(retError, undefined, `setWBTCManager should fail while halted is true`)
    })


    it(`[HTLCWBTC-T2712]`, async() => {
        let beforeWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`beforeWbtcManager:`, beforeWbtcManager);
        let newWbtcManager = '0x0000000000000000000000000000000000000011';

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setWBTCManager(newWbtcManager, {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterWbtcManager = await HTLCWBTCInstance.wbtcManager();
        console.log(`afterWbtcManager:`, afterWbtcManager);

        assert.equal(newWbtcManager, afterWbtcManager, `wbtcManager should be changed`);
        assert.equal(retError, undefined, `setWBTCManager fail`)
    })


    it(`[HTLCWBTC-T2713]`, async() => {
        let beforeStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        console.log(`beforeStoremanGroupAdmin:`, beforeStoremanGroupAdmin);
        let newAddress = '0x0000000000000000000000000000000000000011';

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setStoremanGroupAdmin(newAddress, {from:storeman, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        console.log(`afterStoremanGroupAdmin:`, afterStoremanGroupAdmin);

        assert.equal(beforeStoremanGroupAdmin, afterStoremanGroupAdmin, `storemanGroupAdmin should not be changed`);
        assert.notEqual(retError, undefined, `setStoremanGroupAdmin should fail while called by non owner`)
    })


    it(`[HTLCWBTC-T2714]`, async() => {
        let beforeStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        console.log(`beforeStoremanGroupAdmin:`, beforeStoremanGroupAdmin);
        let newAddress = '0x0000000000000000000000000000000000000011';

        let retError;
        try {
            await HTLCWBTCInstance.setStoremanGroupAdmin(newAddress, {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        let afterStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        console.log(`afterStoremanGroupAdmin:`, afterStoremanGroupAdmin);

        assert.equal(beforeStoremanGroupAdmin, afterStoremanGroupAdmin, `storemanGroupAdmin should not be changed`);
        assert.notEqual(retError, undefined, `setStoremanGroupAdmin should fail while halted is true`)
    })


    it(`[HTLCWBTC-T2715]`, async() => {
        let beforeStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        let beforeCoinAdmin = await HTLCWBTCInstance.coinAdmin();

        console.log(`beforeStoremanGroupAdmin:`, beforeStoremanGroupAdmin);
        let newAddress = '0x0000000000000000000000000000000000000011';

        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.setAdmin(newAddress,newAddress, {from:owner, gas:4000000});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        let afterStoremanGroupAdmin = await HTLCWBTCInstance.storemanGroupAdmin();
        let afterCoinAdmin = await HTLCWBTCInstance.coinAdmin();
        console.log(`afterStoremanGroupAdmin:`, afterStoremanGroupAdmin);
        console.log(`afterCoinAdmin:`, afterCoinAdmin);
        assert.equal(newAddress, afterStoremanGroupAdmin, `storemanGroupAdmin should be changed`);
        assert.equal(newAddress,afterCoinAdmin, `coinAdmin should be changed`);
        assert.equal(retError, undefined, `setStoremanGroupAdmin fail`);
    })


    it('[HTLCWBTC-T2601]', async() => {
        await resetHalted(true);

        let retError;
        try {
            await HTLCWBTCInstance.kill({from:storeman});
        } catch (e) {
            retError = e;
        }

        await resetHalted(false);

        assert.notEqual(retError, undefined, `kill should fail while called by non owner`);
    });


    it('[HTLCWBTC-T2602]', async() => {
        let retError;
        try {
            await HTLCWBTCInstance.kill({from:owner});
        } catch (e) {
            retError = e;
        }

        assert.notEqual(retError, undefined, `kill should fail while halted is true`);
    });

    it('[HTLCWBTC-T2603]', async() => {
        await resetHalted(true);

        let beforeSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let beforeOwnerBalance = await web3.eth.getBalance(owner);
        console.log("beforeSCBalance:", beforeSCBalance);
        console.log("beforeOwnerBalance:", beforeOwnerBalance);

        let ret = await HTLCWBTCInstance.kill({from:owner, gasPrice:"0x"+GasPrice.toString(16)});
        assert.equal(ret.receipt.status, '0x1', 'kill HTLCWBTC SC fail');

        let scCode = await web3.eth.getCode(HTLCWBTCInstance.address);
        console.log("scCode:", scCode);
        assert.equal(scCode, '0x', 'code data should be empoty');

        let afterSCBalance = await web3.eth.getBalance(HTLCWBTCInstance.address);
        let afterOwnerBalance = await web3.eth.getBalance(owner);
        console.log("afterSCBalance:", afterSCBalance);
        console.log("afterOwnerBalance:", afterOwnerBalance);

        let gasPrice = new BigNumber(GasPrice);
        let gasUsed = new BigNumber(ret.receipt.gasUsed);

        assert.equal(afterSCBalance.toString(), "0", "unexcept SC balance");
        assert.equal(afterOwnerBalance.toString(), beforeOwnerBalance.add(beforeSCBalance).sub(gasPrice.mul(gasUsed)).toString(), "unexcept owner balance");

        assert.equal(await HTLCWBTCInstance.lockedTime(), 0, "unexcept locked time");
    });
//*/

})