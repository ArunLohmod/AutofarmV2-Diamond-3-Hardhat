import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import {
  AutoFarmV2Facet,
  DiamondCutFacet,
  DiamondLoupeFacet,
  LibDiamond__factory,
  OwnershipFacet,
  StratX2Facet,
} from "../typechain-types";
import { getSelectorsFromContract } from "../scripts/libraries";

describe("Test", () => {
  let diamondAddres1: string;
  let diamondAddres2: string;
  let diamondCutFacet: Contract | DiamondCutFacet;
  let diamondCutFacet2: Contract | DiamondCutFacet;
  let diamondLoupeFacet: Contract | DiamondLoupeFacet;
  let diamondLoupeFacet2: Contract | DiamondLoupeFacet;
  let ownershipFacet: OwnershipFacet;
  let ownershipFacet2: OwnershipFacet;
  let autoFarmV2Facet: AutoFarmV2Facet;
  let stratX2Facet: StratX2Facet;
  let facetAddresses: string[]; // DiamondCutFacet, DiamondLoupeFacet, TokenAvgPriceV1
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let accounts: SignerWithAddress[];

  before(async () => {
    // deploy contracts
    [diamondAddres1, diamondAddres2] = await deployDiamond();
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres1
    );
    diamondCutFacet2 = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddres2
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddres1
    );
    diamondLoupeFacet2 = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddres2
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddres1
    );
    ownershipFacet2 = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddres2
    );
    autoFarmV2Facet = await ethers.getContractAt(
      "AutoFarmV2Facet",
      diamondAddres1
    );
    stratX2Facet = await ethers.getContractAt("StratX2Facet", diamondAddres2);
    accounts = await ethers.getSigners();
    owner = accounts[0];
    addr1 = accounts[0];
  });

  describe("test - autofarm diamond", () => {
    it("should have 4 facets -- call to facetAddresses", async () => {
      facetAddresses = await diamondLoupeFacet.facetAddresses();
      expect(facetAddresses.length).to.equal(4);
    });

    it("should have the right function selectors -- call to faceFunctionSelectors", async () => {
      let selectors, result;
      // test for DiamondCutFacet
      selectors = getSelectorsFromContract(diamondCutFacet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[0]
      );
      assert.sameMembers(result, selectors);

      // test for DiamondLoupeFacet
      selectors = getSelectorsFromContract(diamondLoupeFacet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[1]
      );
      assert.sameMembers(result, selectors);

      // test for ownership facet
      selectors = getSelectorsFromContract(ownershipFacet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[2]
      );
      assert.sameMembers(result, selectors);
      // test for autofarmfacet
      selectors = getSelectorsFromContract(autoFarmV2Facet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[3]
      );
      assert.sameMembers(result, selectors);
    });
    it("owner of the contract", async () => {
      const contractOwner = await ownershipFacet.owner();
      assert(contractOwner === owner.address);
    });
    it("transferring ownership", async () => {
      await ownershipFacet.transferOwnership(addr1.address);
      const contractOwner = await ownershipFacet.owner();
      assert(contractOwner === addr1.address);
    });
  });

  describe("test - stratx2 diamond", () => {
    it("should have 4 facets -- call to facetAddresses", async () => {
      facetAddresses = await diamondLoupeFacet2.facetAddresses();
      expect(facetAddresses.length).to.equal(4);
    });

    it("should have the right function selectors -- call to faceFunctionSelectors", async () => {
      let selectors, result;
      // test for DiamondCutFacet
      selectors = getSelectorsFromContract(diamondCutFacet2).getSelectors();
      result = await diamondLoupeFacet2.facetFunctionSelectors(
        facetAddresses[0]
      );
      assert.sameMembers(result, selectors);

      // test for DiamondLoupeFacet
      selectors = getSelectorsFromContract(diamondLoupeFacet2).getSelectors();
      result = await diamondLoupeFacet2.facetFunctionSelectors(
        facetAddresses[1]
      );
      assert.sameMembers(result, selectors);

      // test for ownership facet
      selectors = getSelectorsFromContract(ownershipFacet2).getSelectors();
      result = await diamondLoupeFacet2.facetFunctionSelectors(
        facetAddresses[2]
      );
      assert.sameMembers(result, selectors);
      // test for autofarmfacet
      selectors = getSelectorsFromContract(stratX2Facet).getSelectors();
      result = await diamondLoupeFacet2.facetFunctionSelectors(
        facetAddresses[3]
      );
      assert.sameMembers(result, selectors);
    });
    it("owner of the contract", async () => {
      const contractOwner = await ownershipFacet2.owner();
      assert(contractOwner === owner.address);
    });
    it("transferring ownership", async () => {
      await ownershipFacet2.transferOwnership(addr1.address);
      const contractOwner = await ownershipFacet2.owner();
      assert(contractOwner === addr1.address);
    });
  });
});
