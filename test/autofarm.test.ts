/* global describe it before ethers */

import { deployDiamond } from "../scripts/deploy";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
  AutoFarmV2Facet,
  Diamond,
  DiamondCutFacet,
  DiamondLoupeFacet,
  MyToken1,
  OwnershipFacet,
  StratX2Facet,
} from "../typechain-types";

describe("AutoFarmV2-Diamond-Standard-Test", async function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let diamondAddres1: string;
  let diamondAddres2: string;
  let diamondCutFacet: DiamondCutFacet;
  let diamondCutFacet2: DiamondCutFacet;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let diamondLoupeFacet2: DiamondLoupeFacet;
  let ownershipFacet: OwnershipFacet;
  let autofarmV2Facet: AutoFarmV2Facet;
  let stratX2Facet: StratX2Facet;
  let token1: MyToken1;
  let token2: MyToken1;
  let zeroAddress: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    zeroAddress = ethers.constants.AddressZero;

    [diamondAddres1, diamondAddres2] = await deployDiamond();
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres1
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddres1
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddres1
    );
    autofarmV2Facet = await ethers.getContractAt(
      "AutoFarmV2Facet",
      diamondAddres1
    );

    stratX2Facet = await ethers.getContractAt("StratX2Facet", diamondAddres2);
    diamondCutFacet2 = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres2
    );
    diamondLoupeFacet2 = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddres2
    );

    const MyToken1 = await ethers.getContractFactory("MyToken1");
    token1 = await MyToken1.deploy();
    await token1.deployed();

    // Deploy DiamondInit.sol
    const DiamondInit = await ethers.getContractFactory("DiamondInit");
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();

    // deploy AUTOv2 token
    const AUTOv2 = await ethers.getContractFactory("AUTOv2");
    const autov2a = await AUTOv2.deploy();
    await autov2a.deployed();

    // setting values in autofarminit and stratxinit functions
    let autoV2InitFunctionCall = diamondInit.interface.encodeFunctionData(
      "autofarmV2Init",
      [autov2a.address]
    );
    let startx2InitFunctionCall = diamondInit.interface.encodeFunctionData(
      "stratX2Init",
      [
        [zeroAddress, token1.address, zeroAddress, zeroAddress, zeroAddress],
        diamondAddres1,
        zeroAddress,
        false,
        [],
        [],
        [],
        [],
        [],
      ]
    );

    await diamondCutFacet.diamondCut(
      [], //cut
      diamondInit.address,
      autoV2InitFunctionCall
    );
    await diamondCutFacet2.diamondCut(
      [], //cut
      diamondInit.address,
      startx2InitFunctionCall
    );

    token2 = await MyToken1.deploy();
    await token2.deployed();

    // changing ownership from owner to
    await autov2a.transferOwnership(diamondAddres1);
  });

  it("diamond1 should have 4 facets -- call to facetAddresses function", async () => {
    const faccetAddresses = await diamondLoupeFacet.facetAddresses();
    expect(faccetAddresses.length).to.equal(4);
  });

  it("diamond2 should have 4 facets -- call to facetAddresses function", async () => {
    const faccetAddresses = await diamondLoupeFacet2.facetAddresses();
    expect(faccetAddresses.length).to.equal(4);
  });

  it("only owner can add tokens in pool", async function () {
    await expect(
      autofarmV2Facet
        .connect(addr1)
        .add(1000000, token1.address, true, diamondAddres2)
    ).to.be.reverted;
  });

  it("owner will add token1 in pools", async function () {
    await autofarmV2Facet.add(1000000, token1.address, true, diamondAddres2);

    expect(await autofarmV2Facet.poolLength()).to.equal(1);
  });

  it("updating pool 0", async function () {
    await autofarmV2Facet.set(0, 10000000, true);

    const [, allockPoint, , ,] = await autofarmV2Facet.poolInfo(0);
    await expect(allockPoint).to.equal(10000000);
  });

  it("only owner can update pool", async function () {
    await expect(autofarmV2Facet.connect(addr1).set(0, 100000, true)).to.be
      .reverted;
  });

  it("depositing in pool id 0", async function () {
    await token1.mint(addr1.address, BigNumber.from("100000000000000000000"));
    expect(await token1.balanceOf(addr1.address)).to.equal(
      BigNumber.from("100000000000000000000")
    );

    await token1
      .connect(addr1)
      .approve(autofarmV2Facet.address, BigNumber.from("1000000000000000000"));
    await autofarmV2Facet
      .connect(addr1)
      .deposit(0, BigNumber.from("1000000000000000000"));

    const [shares] = await autofarmV2Facet.userInfo(0, addr1.address);
    expect(shares).to.equal(BigNumber.from("1000000000000000000"));

    //
    await token1
      .connect(addr1)
      .approve(autofarmV2Facet.address, BigNumber.from("1000000000000000000"));
    await autofarmV2Facet
      .connect(addr1)
      .deposit(0, BigNumber.from("1000000000000000000"));
  });

  it("can not deposit to a pool which is not created", async function () {
    await token1
      .connect(addr1)
      .approve(autofarmV2Facet.address, BigNumber.from("1000000000000000000"));
    await expect(
      autofarmV2Facet
        .connect(addr1)
        .deposit(1, BigNumber.from("1000000000000000000"))
    ).to.be.reverted;
  });

  it("can not withdraw without deposit", async function () {
    await expect(
      autofarmV2Facet
        .connect(addr2)
        .withdraw(0, BigNumber.from("1000000000000000000"))
    ).to.be.reverted;
  });

  it("withdraw from pool id 0", async function () {
    await autofarmV2Facet
      .connect(addr1)
      .withdraw(0, BigNumber.from("2000000000000000000"));

    const [shares] = await autofarmV2Facet.userInfo(0, addr1.address);
    expect(shares).to.equal(0);
  });

  it("withdaw all ", async function () {
    await token1
      .connect(addr1)
      .approve(autofarmV2Facet.address, BigNumber.from("1000000000000000000"));
    await autofarmV2Facet
      .connect(addr1)
      .deposit(0, BigNumber.from("1000000000000000000"));

    await autofarmV2Facet.connect(addr1).withdrawAll(0);

    const [shares] = await autofarmV2Facet.userInfo(0, addr1.address);
    expect(shares).to.equal(0);
    expect(await token1.balanceOf(addr1.address)).to.equal(
      BigNumber.from("100000000000000000000")
    );
  });

  it("emergency withdraw ", async function () {
    await token1
      .connect(addr1)
      .approve(autofarmV2Facet.address, BigNumber.from("1000000000000000000"));
    await autofarmV2Facet
      .connect(addr1)
      .deposit(0, BigNumber.from("1000000000000000000"));

    await autofarmV2Facet.connect(addr1).emergencyWithdraw(0);

    const [shares] = await autofarmV2Facet.userInfo(0, addr1.address);
    expect(shares).to.equal(0);
    expect(await token1.balanceOf(addr1.address)).to.equal(
      BigNumber.from("100000000000000000000")
    );
  });
  it("should return the stuck staked tokens", async () => {
    await token2.mint(owner.address, 100000);
    let bal = await token2.balanceOf(owner.address);

    await token2.connect(owner).transfer(diamondAddres1, bal);
    await expect(
      autofarmV2Facet.connect(owner).inCaseTokensGetStuck(token2.address, bal)
    ).to.changeTokenBalance(token2, owner.address, bal);
  });
  it("will check for pending auto", async () => {
    expect(await autofarmV2Facet.pendingAUTO(0, addr1.address)).to.equal(0);
  });
  it("will check for stakedWantTokens", async function () {
    expect(await autofarmV2Facet.stakedWantTokens(0, addr1.address)).to.equal(
      0
    );
  });
  it("will get multiplier", async function () {
    expect(await autofarmV2Facet.getMultiplier(0, 10)).to.equal(10);
  });
});
