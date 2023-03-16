import { ethers } from "hardhat";
import { getSelectorsFromContract, FacetCutAction } from "./libraries";

export async function deployAutoFarmV2Diamond() {
  console.log("**** Deploying diamond for AutoFarmV2...");

  const accounts = await ethers.getSigners();
  const owner = accounts[0];

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();

  console.log("DiamondCutFacet deployed at: ", diamondCutFacet.address);

  // deploy Diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(owner.address, diamondCutFacet.address);
  await diamond.deployed();

  console.log("Diamond deployed at: ", diamond.address);

  // deploy DiamondInit
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();

  console.log("DiamondInit deployed at: ", diamondInit.address);

  // deploy facets
  // console.log("Deploying facets");
  const FacetNames = ["DiamondLoupeFacet", "OwnershipFacet", "AutoFarmV2Facet"];
  const cut = [];
  for (const facetName of FacetNames) {
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.deployed();

    console.log(`${facetName} deployed at ${facet.address}`);

    const selectors = getSelectorsFromContract(facet);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: selectors.getSelectors(),
    });
  }

  // console.log("Diamond Cut: ", cut);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  const functionCall = diamondInit.interface.encodeFunctionData("init");
  const tx = await diamondCut.diamondCut(
    cut,
    diamondInit.address,
    functionCall
  );
  // console.log("Diamond cut tx: ", tx.hash);
  const receipt = await tx.wait();
  // console.log("returned status: ", receipt);
  if (!receipt.status) throw Error(`Diamond upgrade failed: ${tx.hash}`);

  console.log("**** Diamond deploy end");
  return diamond.address;
}
