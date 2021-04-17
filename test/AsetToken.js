const { expect } = require('chai');
const BigNumber = require('bignumber.js')
const { buildPermitParams, getSignatureFromTypedData, MAX_UINT_AMOUNT } = require('./helpers/contract-helpers')
let AsetToken;
let asetToken;

let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const testAccount = [
    "0xd718CA524f063f17E465679d5Acc1f5e6A549c65",
    "0x8De5Fa141FB47b4EC267Ca5430De5Dd040708153",
    "0x183C8BbFA44969Bafd619C0D38Cf0206a87A024F",
    "0x6C7d38e0E8F34142d49373EA54F2dd610fe9319E",
    "0x85C0334A3903A5BfAFA878612A01f505bA57D73a"
]

const testAccPk = [
    "0x5f35dcec86fc6944a9fede6e976bf6a883a29fafabd1ec19862a6b409f8d944a", // owner
    "0xf7a6c765884b094d7a1e24b7884b1ae9f7deeb6f29a4e7d43deec0aa3886f99d", // deployer
    "0x305cec9ffad2002eae591842d6c6ff04d71b90c58595381d1d996801de94e163", // user 1
    "0x3a7fe8ca63008892292cc6c348d1af65521c96234634cc03d7dcb24cac6a0af7", // user 2
    "0x492af1648dc9ca27646442a28217d1845c660cbf5729cc6479b9ddf048c39a89"// user 3
]
 
// Start test block
describe('AsetToken', function () {
  beforeEach(async function () {

    const [owner, deployer] = await ethers.getSigners();

    AsetToken = await ethers.getContractFactory("AsetToken");
    asetToken = await upgrades.deployProxy(AsetToken, [deployer.address, ZERO_ADDRESS]);
  });
 
  it('Checks initial configuration', async function () {
    expect(await asetToken.name()).to.be.equal('Aset Token', 'Invalid token name');

    expect(await asetToken.symbol()).to.be.equal('ASET', 'Invalid token symbol');

    expect((await asetToken.decimals()).toString()).to.be.equal('18', 'Invalid token decimals');
  });

  it('Checks the domain separator', async () => {
    const DOMAIN_SEPARATOR_ENCODED = '0xa687ad91ecebc9552371afb21933904f5d8bd5749ac6f933ec958250fd67dce2'

    const separator = await asetToken.DOMAIN_SEPARATOR();
    expect(separator).to.be.equal(DOMAIN_SEPARATOR_ENCODED, 'Invalid domain separator');
  });

  it('Checks the revision', async () => {
    const revision = await asetToken.REVISION();

    expect(revision.toString()).to.be.equal('1', 'Invalid revision');
  });

  it('Checks the allocation of the initial ASET supply', async () => {
    const [, deployer,] = await ethers.getSigners();

    const expectedlDistributorBalance = new BigNumber(16000000).times(new BigNumber(10).pow(18));
    const distributorBalance = await asetToken.balanceOf(deployer.address);

    expect(distributorBalance.toString()).to.be.equal(
      expectedlDistributorBalance.toFixed(0),
      'Invalid distributor balance'
    );
  });

  it("Checks the snapshots emitted after the initial allocation", async () => {
    const [owner, deployer, users] = await ethers.getSigners();

    const userCountOfSnapshots = await asetToken._countsSnapshots(
      deployer.address
    );
    const snapshot = await asetToken._snapshots(
      deployer.address,
      userCountOfSnapshots.sub(1)
    );
    expect(userCountOfSnapshots.toString()).to.be.equal(
      "1",
      "INVALID_SNAPSHOT_COUNT"
    );
    expect(snapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther("16000000"),
      "INVALID_SNAPSHOT_VALUE"
    );
  });

  it("Should transfer tokens between accounts", async function () {
    const [owner, deployer, user1, user2] = await ethers.getSigners();

    // Transfer 10 tokens from deployer to addr1
    await asetToken.connect(deployer).transfer(user1.address, ethers.utils.parseEther("10"));
    const user1Balance = await asetToken.balanceOf(user1.address);
    expect(user1Balance).to.equal(ethers.utils.parseEther("10"));

    // Transfer 10 tokens from addr1 to addr2
    await asetToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("10"));
    const user2Balance = await asetToken.balanceOf(user2.address);
    expect(user2Balance).to.equal(ethers.utils.parseEther("10"));
  });

  it("Record correctly snapshot on transfer", async () => {
    const [owner, deployer, addr3, addr4] = await ethers.getSigners();

    
    await asetToken.connect(deployer).transfer(addr3.address, ethers.utils.parseEther("10"));
    
    const from = addr3.address;
    const to = addr4.address;
    await asetToken.connect(addr3).transfer(to, ethers.utils.parseEther("10"));

    const fromCountOfSnapshots = await asetToken._countsSnapshots(from);

    const fromLastSnapshot = await asetToken._snapshots(
      from,
      fromCountOfSnapshots.sub(1)
    );
    const fromPreviousSnapshot = await asetToken._snapshots(
      from,
      fromCountOfSnapshots.sub(2)
    );

    const toCountOfSnapshots = await asetToken._countsSnapshots(to);
    const toSnapshot = await asetToken._snapshots(
      to,
      toCountOfSnapshots.sub(1)
    );

    expect(fromCountOfSnapshots.toString()).to.be.equal(
      "2",
      "INVALID_SNAPSHOT_COUNT"
    );
    expect(fromLastSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('0'),
      "INVALID_SNAPSHOT_VALUE"
    );
    expect(fromPreviousSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther("10"),
      "INVALID_SNAPSHOT_VALUE"
    );

    expect(toCountOfSnapshots.toString()).to.be.equal(
      "1",
      "INVALID_SNAPSHOT_COUNT"
    );
    expect(toSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther("10"),
      "INVALID_SNAPSHOT_VALUE"
    );
  });

  it("Reverts submitting a permit with 0 expiration", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }

    const expiration = 0;
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = ethers.utils.parseEther("2").toString();

    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      expiration.toFixed()
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      "0",
      "INVALID_ALLOWANCE_BEFORE_PERMIT"
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      asetToken
        .connect(addr1)
        .permit(owner, spender, permitAmount, expiration, v, r, s)
    ).to.be.revertedWith("INVALID_EXPIRATION");

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      "0",
      "INVALID_ALLOWANCE_AFTER_PERMIT"
    );
    
  })

  it("Submits a permit with maximum expiration length", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = ethers.utils.parseEther("2").toString();
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      deadline
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      "0",
      "INVALID_ALLOWANCE_BEFORE_PERMIT"
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await asetToken
      .connect(addr1)
      .permit(owner, spender, permitAmount, deadline, v, r, s)

    expect((await asetToken._nonces(owner)).toNumber()).to.be.equal(1);

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      ethers.utils.parseEther("2").toString(),
      "INVALID_ALLOWANCE_AFTER_PERMIT"
    );

  });

  it("Cancels the previous permit", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = ethers.utils.parseEther("2").toString();
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      deadline
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      "0",
      "INVALID_ALLOWANCE_BEFORE_PERMIT"
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await asetToken
      .connect(addr1)
      .permit(owner, spender, permitAmount, deadline, v, r, s)

    expect((await asetToken._nonces(owner)).toNumber()).to.be.equal(1);

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      ethers.utils.parseEther("2").toString(),
      "INVALID_ALLOWANCE_AFTER_PERMIT"
    );

    const permitAmount2 = "0";
    const nonce2 = (await asetToken._nonces(owner)).toNumber();

    const msgParams2 = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce2,
      permitAmount2,
      deadline
    );

    const { v: v2, r: r2, s: s2 } = getSignatureFromTypedData(ownerPrivateKey, msgParams2);

    await asetToken
        .connect(addr1)
        .permit(owner, spender, "0", deadline, v2, r2, s2)

    expect((await asetToken.allowance(owner, spender)).toString()).to.be.equal(
      permitAmount2,
      "INVALID_ALLOWANCE_AFTER_PERMIT"
    );

    expect((await asetToken._nonces(owner)).toNumber()).to.be.equal(2);

  });

  it("Tries to submit a permit with invalid nonce", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = 1000;
    const permitAmount = "0";
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      deadline
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      asetToken
        .connect(addr1)
        .permit(owner, spender, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith("INVALID_SIGNATURE");
  });

  it("Tries to submit a permit with invalid expiration (previous to the current block)", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }    
    
    const expiration = "1";
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = "0";
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      expiration
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      asetToken
        .connect(addr1)
        .permit(owner, spender, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith("INVALID_EXPIRATION");
  });

  it("Tries to submit a permit with invalid signature", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }    
    
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = "0";
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      deadline
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      asetToken
        .connect(addr1)
        .permit(owner, ZERO_ADDRESS, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith("INVALID_SIGNATURE");
  });

  it("Tries to submit a permit with invalid owner", async () => {
    const [addr1] = await ethers.getSigners();

    const owner = testAccount[0];
    const spender = testAccount[1];

    const { chainId } = await ethers.provider.getNetwork()
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }

    const expiration = MAX_UINT_AMOUNT;
    const nonce = (await asetToken._nonces(owner)).toNumber();
    const permitAmount = "0";
    const msgParams = buildPermitParams(
      chainId,
      asetToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      expiration
    );

    const ownerPrivateKey = testAccPk[0];
    if (!ownerPrivateKey) {
      throw new Error("INVALID_OWNER_PK");
    }
    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      asetToken
        .connect(addr1)
        .permit(ZERO_ADDRESS, spender, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith("INVALID_OWNER");
  });

  it("Correct snapshotting on double action in the same block", async () => {
    const [owner, deployer, user1, user2] = await ethers.getSigners();

    let DoubleTransferHelper = await ethers.getContractFactory("DoubleTransferHelper");
    doubleTransferHelper = await DoubleTransferHelper.deploy(asetToken.address);

    const receiver = user1.address;

    await asetToken.connect(deployer).transfer(
      doubleTransferHelper.address,
      ethers.utils.parseEther("1").toString()
    )

    await doubleTransferHelper.doubleSend(
        receiver,
        ethers.utils.parseEther("0.2"),
        ethers.utils.parseEther("0.8")
    )

    const countSnapshotsReceiver = (
      await asetToken._countsSnapshots(receiver)
    ).toString();

    const snapshotReceiver = await asetToken._snapshots(
      doubleTransferHelper.address,
      0
    );

    const countSnapshotsSender = (
      await asetToken._countsSnapshots(doubleTransferHelper.address)
    ).toString();

    expect(countSnapshotsSender).to.be.equal(
      "2",
      "INVALID_COUNT_SNAPSHOTS_SENDER"
    );
    const snapshotsSender = [
      await asetToken._snapshots(doubleTransferHelper.address, 0),
      await asetToken._snapshots(doubleTransferHelper.address, 1),
    ];

    expect(snapshotsSender[0].value.toString()).to.be.equal(
      ethers.utils.parseEther("1"),
      "INVALID_SENDER_SNAPSHOT"
    );
    expect(snapshotsSender[1].value.toString()).to.be.equal(
      ethers.utils.parseEther("0"),
      "INVALID_SENDER_SNAPSHOT"
    );

    expect(countSnapshotsReceiver).to.be.equal(
      "1",
      "INVALID_COUNT_SNAPSHOTS_RECEIVER"
    );
    expect(snapshotReceiver.value.toString()).to.be.equal(
      ethers.utils.parseEther("1")
    );

  });

  // it("Emits correctly mock event of the _beforeTokenTransfer hook", async () => {
  //   const [addr1] = await ethers.getSigners();

  //   let mockTransferHook = await ethers.getContractFactory("MockTransferHook");
    
  //   const recipient = testAccount[2];

  //   await expect(
  //     asetToken.connect(addr1).transfer(recipient, 1)
  //   ).to.emit(mockTransferHook, "MockHookEvent");
  // });

  it("Don't record snapshot when sending funds to itself", async () => {
    const [owner, deployer] = await ethers.getSigners();

    const from = deployer.address;
    const to = from;

    const fromCountOfSnapshotsBefore = await asetToken._countsSnapshots(from);
    const toCountOfSnapshotsBefore = await asetToken._countsSnapshots(to);


    await asetToken
      .connect(deployer)
      .transfer(to, ethers.utils.parseEther("1"))

    const fromCountOfSnapshotsAfter = await asetToken._countsSnapshots(from);
    const toCountOfSnapshotsAfter = await asetToken._countsSnapshots(to);

    expect(fromCountOfSnapshotsBefore.toString()).to.be.equal(
      fromCountOfSnapshotsAfter.toString(),
      "INVALID_SNAPSHOT_COUNT"
    );

    expect(toCountOfSnapshotsBefore.toString()).to.be.equal(
      toCountOfSnapshotsAfter.toString(),
      "INVALID_SNAPSHOT_COUNT"
    );


    const fromLastSnapshot = await asetToken._snapshots(
      from,
      fromCountOfSnapshotsAfter.sub(1)
    );

    const toSnapshot = await asetToken._snapshots(
      to,
      toCountOfSnapshotsAfter.sub(1)
    );

    const expectedBalanceFrom = new BigNumber(16000000).times(new BigNumber(10).pow(18));

    expect(fromLastSnapshot.value.toString()).to.be.equal(
      expectedBalanceFrom.toFixed(0),
      "INVALID_SNAPSHOT_VALUE"
    );

    const expectedBalanceTo = new BigNumber(16000000).times(new BigNumber(10).pow(18));

    expect(toSnapshot.value.toString()).to.be.equal(
      expectedBalanceTo.toFixed(0),
      "INVALID_SNAPSHOT_VALUE"
    );
  });


});

async function waitForTx(tx){
  return new Promise(async function(resolve, reject){
    await tx.wait();
    resolve()
  })
}