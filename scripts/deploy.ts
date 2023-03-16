import { deployAutoFarmV2Diamond } from "./deploy-autofarmv2";
import { deployStratX2Diamond } from "./deploy-stratx2";

export async function deployDiamond() {
  const autofarmv2diamond = await deployAutoFarmV2Diamond();
  const stratx2diamond = await deployStratX2Diamond();

  return [autofarmv2diamond, stratx2diamond];
}