import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
  AUTOv2,
  AutoFarmV2Facet,
  DiamondCutFacet,
  DiamondLoupeFacet,
  ERC20,
  Liquidity,
  MyToken1,
  StratX2Facet,
} from "../typechain-types";
import { deployDiamond } from "../scripts/deploy";

import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployAutoFarmV2Diamond } from "../scripts/deploy-autofarmv2";

describe("StratX2-Diamond-Standard-Test", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let wantToken: ERC20;
  let diamondAddres: string;
  let diamondCutFacet: DiamondCutFacet;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let stratX2Facet: StratX2Facet;
  let farmContractFacet: AutoFarmV2Facet;
  let diamondForFarmContract: string;
  let autov2a: AUTOv2;
  let autov2b: AUTOv2;
  let token0: MyToken1;
  let token1: MyToken1;
  let liquidity: Liquidity;
  let zeroAddress: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    zeroAddress = ethers.constants.AddressZero;

    const MyToken1 = await ethers.getContractFactory("MyToken1");

    token0 = await MyToken1.deploy();
    await token0.deployed();

    token1 = await MyToken1.deploy();
    await token1.deployed();

    // deploy AUTOv2 token
    const AUTOv2 = await ethers.getContractFactory("AUTOv2");
    autov2a = await AUTOv2.deploy();
    await autov2a.deployed();
    await autov2a.mint(owner.address, BigNumber.from("100000000000000000000"));

    autov2b = await AUTOv2.deploy(); // earn token for stratx2facet
    await autov2b.deployed();
    await autov2b.mint(owner.address, BigNumber.from("100000000000000000000"));

    // --------------------------------

    const Liquidity = await ethers.getContractFactory("Liquidity");
    liquidity = await Liquidity.deploy();
    await liquidity.deployed();

    await token0.mint(owner.address, BigNumber.from("100000000000000000000"));
    await token1.mint(owner.address, BigNumber.from("100000000000000000000"));

    await token0.approve(
      liquidity.address,
      BigNumber.from("10000000000000000000")
    );
    await token1.approve(
      liquidity.address,
      BigNumber.from("10000000000000000000")
    );

    await liquidity.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from("1000000000000000000"),
      BigNumber.from("1000000000000000000")
    );

    await autov2a.approve(
      liquidity.address,
      BigNumber.from("1000000000000000000")
    );
    await autov2b.approve(
      liquidity.address,
      BigNumber.from("10000000000000000000")
    );

    await liquidity.addLiquidity(
      //earned to auto
      autov2b.address,
      autov2a.address,
      BigNumber.from("1000000000000000000"),
      BigNumber.from("1000000000000000000")
    );

    // earn token to token0
    await liquidity.addLiquidity(
      autov2b.address,
      token0.address,
      BigNumber.from("1000000000000000000"),
      BigNumber.from("1000000000000000000")
    );

    // earn token to token1
    await liquidity.addLiquidity(
      autov2b.address,
      token1.address,
      BigNumber.from("1000000000000000000"),
      BigNumber.from("1000000000000000000")
    );

    const wantaddress = await liquidity.getPair(token0.address, token1.address);
    wantToken = await ethers.getContractAt("ERC20", wantaddress);

    // ---------------------------------

    [, diamondAddres] = await deployDiamond();
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddres
    );

    stratX2Facet = await ethers.getContractAt("StratX2Facet", diamondAddres);
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres
    );

    // Deploy DiamondInit.sol
    const DiamondInit = await ethers.getContractFactory("DiamondInit");
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();

    // for farmContractAddress

    diamondForFarmContract = await deployAutoFarmV2Diamond();
    farmContractFacet = await ethers.getContractAt(
      "AutoFarmV2Facet",
      diamondForFarmContract
    );
    const diamondCutFacet2 = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondForFarmContract
    );

    // changing ownership of autov2 to farmCntract address
    await autov2b.transferOwnership(diamondForFarmContract);

    let farmContractFunctionCall = diamondInit.interface.encodeFunctionData(
      "autofarmV2Init",
      [autov2b.address]
    );

    await diamondCutFacet2.diamondCut(
      [], //cut
      diamondInit.address,
      farmContractFunctionCall
    );

    // setting values in stratxinit functions
    let startx2InitFunctionCall = diamondInit.interface.encodeFunctionData(
      "stratX2Init",
      [
        [
          autov2a.address,
          wantToken.address,
          autov2b.address,
          token0.address,
          token1.address,
        ],
        owner.address,
        diamondForFarmContract,
        true,
        [autov2b.address, autov2a.address],
        [autov2b.address, token0.address],
        [autov2b.address, token1.address],
        [token0.address, autov2b.address],
        [token1.address, autov2b.address],
      ]
    );

    await diamondCutFacet.diamondCut(
      [], //cut
      diamondInit.address,
      startx2InitFunctionCall
    );

    const [, diamondStrt2] = await deployDiamond();
    const srtat2 = await ethers.getContractAt("StratX2Facet", diamondStrt2);
    const diamondCutFacet3 = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondStrt2
    );

    let startx2InitFunctionCall2 = diamondInit.interface.encodeFunctionData(
      "stratX2Init",
      [
        [zeroAddress, wantToken.address, zeroAddress, zeroAddress, zeroAddress],
        diamondForFarmContract,
        zeroAddress,
        false,
        [],
        [],
        [],
        [],
        [],
      ]
    );

    await diamondCutFacet3.diamondCut(
      [], //cut
      diamondInit.address,
      startx2InitFunctionCall2
    );

    await farmContractFacet.add(1000, wantToken.address, false, diamondStrt2);
  });

  it("no one other than owner can deposit", async function () {
    await expect(stratX2Facet.connect(addr1).deposit(10000)).to.be.reverted;
  });

  it("owner will deposit", async function () {
    console.log("the want token in tests cases is", wantToken.address);
    await wantToken.approve(
      stratX2Facet.address,
      BigNumber.from("1000000000000000")
    );
    await stratX2Facet
      .connect(owner)
      .deposit(BigNumber.from("1000000000000000"));

    expect(await stratX2Facet.sharesTotal()).to.equal(
      BigNumber.from("1000000000000000")
    );
  });

  it("Should convert dust to earn Tokens", async () => {
    await stratX2Facet.convertDustToEarned();
  });

  it("earn", async () => {
    await stratX2Facet.connect(owner).earn();
  });

  it("owner will withdraw his deposit", async function () {
    const sharesTotal_before = await stratX2Facet.sharesTotal();
    await stratX2Facet
      .connect(owner)
      .withdraw(BigNumber.from("1000000000000000"));

    const sharesTotal_after = await stratX2Facet.sharesTotal();

    expect(sharesTotal_before.sub(sharesTotal_after)).to.be.greaterThan(0);
  });

  it("can not deposit when paused", async () => {
    await stratX2Facet.pause();

    await wantToken.approve(
      stratX2Facet.address,
      BigNumber.from("1000000000000000000")
    );
    await expect(stratX2Facet.deposit(BigNumber.from("1000000000000000000"))).to
      .be.reverted;

    await stratX2Facet.unpause();
  });

  it("calling setSettings", async () => {
    expect(await stratX2Facet.setSettings(9960, 9960, 200, 700, 900))
      .to.emit("StratX2Facet", "SetSettings")
      .withArgs(9960, 9960, 200, 700, 900);
  });
  it("calling setGov", async () => {
    expect(await stratX2Facet.setGov(addr1.address))
      .to.emit("StratX2Facet", "SetGov")
      .withArgs(addr1.address);

    // changing again to owner
    expect(await stratX2Facet.connect(addr1).setGov(owner.address))
      .to.emit("StratX2Facet", "SetGov")
      .withArgs(owner.address);
  });
  it("calling setOnlyGov", async function () {
    expect(await stratX2Facet.setOnlyGov(false))
      .to.emit("StratX2Facet", "SetOnlyGov")
      .withArgs(false);
  });
  it("should set UniRouterAddress", async () => {
    expect(
      await stratX2Facet.setUniRouterAddress(
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
      )
    )
      .to.emit("StratX2Facet", "SetUniRouterAddress")
      .withArgs("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  });
  it("should set BuyBackAddress", async () => {
    expect(await stratX2Facet.setBuyBackAddress(zeroAddress))
      .to.emit("StratX2Facet", "SetBuyBackAddress")
      .withArgs(zeroAddress);
  });

  it("should set RewardsAddress", async () => {
    expect(await stratX2Facet.setRewardsAddress(zeroAddress))
      .to.emit("StratX2Facet", "SetRewardsAddress")
      .withArgs(zeroAddress);
  });

  it("should return the stuck staked tokens", async () => {
    let bal = await token0.balanceOf(owner.address);

    await token0.connect(owner).transfer(diamondAddres, bal);
    await expect(
      stratX2Facet
        .connect(owner)
        .inCaseTokensGetStuck(token0.address, bal, owner.address)
    ).to.changeTokenBalance(token0, owner.address, bal);
  });
});
