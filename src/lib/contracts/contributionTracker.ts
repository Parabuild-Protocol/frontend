// lib/contracts/contributionTracker.ts
import { ethers } from "ethers";
import { CONTRIBUTION_TRACKER_ABI } from "../web3/abis";


// Contract address (replace with actual deployed address)
export const CONTRIBUTION_TRACKER_ADDRESS = process.env.CONTRIBUTION_TRACKER_ADDRESS || "0x404029dB85EeAd1a66D0366bb1F3fb185191E3E4";

/**
 * ContributionType enum - MUST match contract exactly
 * From ContributionTracker.sol:
 * enum ContributionType {
 *   HACKATHON_WIN,              // 0
 *   HACKATHON_PARTICIPATION,    // 1
 *   GITHUB_VERIFICATION,        // 2
 *   QUEST_COMPLETION,           // 3
 *   BOUNTY_COMPLETION,          // 4
 *   OPEN_SOURCE_CONTRIBUTION    // 5
 * }
 */
export enum ContributionTypeContract {
  HACKATHON_WIN = 0,
  HACKATHON_PARTICIPATION = 1,
  GITHUB_VERIFICATION = 2,
  QUEST_COMPLETION = 3,
  BOUNTY_COMPLETION = 4,
  OPEN_SOURCE_CONTRIBUTION = 5,
}

/**
 * Map frontend ContributionType string to contract enum value
 * Must match the ContributionType enum from types/contribution.types.ts
 */
export const mapContributionTypeToContract = (frontendType: string): number => {
  const mapping: Record<string, number> = {
    "Hackathon win": ContributionTypeContract.HACKATHON_WIN,
    "Hackathon participation": ContributionTypeContract.HACKATHON_PARTICIPATION,
    "Bounty": ContributionTypeContract.BOUNTY_COMPLETION,
    "Open source": ContributionTypeContract.OPEN_SOURCE_CONTRIBUTION,
    "Tutorial": ContributionTypeContract.GITHUB_VERIFICATION,
  };
  
  return mapping[frontendType] ?? ContributionTypeContract.GITHUB_VERIFICATION;
};

/**
 * Default base points per type (from contract initialization)
 * These can be fetched dynamically via getBasePoints(contribType)
 */
export const DEFAULT_POINTS: Record<number, number> = {
  [ContributionTypeContract.HACKATHON_WIN]: 10_000,         // 10K points
  [ContributionTypeContract.HACKATHON_PARTICIPATION]: 1_000, // 1K points
  [ContributionTypeContract.GITHUB_VERIFICATION]: 500,       // 500 points
  [ContributionTypeContract.QUEST_COMPLETION]: 300,          // 300 points
  [ContributionTypeContract.BOUNTY_COMPLETION]: 5_000,       // 5K points
  [ContributionTypeContract.OPEN_SOURCE_CONTRIBUTION]: 2_000, // 2K points
};

/**
 * Default conversion ratio: 1000 points = 1 token (from contract)
 * Can be fetched dynamically via pointsToTokenRatio()
 */
export const DEFAULT_POINTS_TO_TOKEN_RATIO = 1000;

/**
 * Calculate expected token amount from points
 * Formula from contract: tokens = (points * 10^18) / pointsToTokenRatio
 */
export const calculateExpectedTokens = (
  points: number,
  ratio: number = DEFAULT_POINTS_TO_TOKEN_RATIO
): string => {
  const tokenAmount = (points * 1e18) / ratio;
  return (tokenAmount / 1e18).toFixed(2);
};

/**
 * Submit contribution to smart contract
 * @param provider Ethers BrowserProvider
 * @param contributionType Contract enum value (0-5)
 * @param points Points to submit (must be <= 2x basePoints)
 * @param proofUrl URL to proof of contribution
 * @param backendId Backend ID as hex string (e.g., "0xdb28ec4e...")
 * @returns Transaction hash and contribution ID
 */
export const submitContributionToContract = async (
  provider: ethers.BrowserProvider,
  contributionType: number,
  points: number,
  proofUrl: string,
  backendId: string
): Promise<{ txHash: string; contributionId: number }> => {
  try {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      CONTRIBUTION_TRACKER_ADDRESS,
      CONTRIBUTION_TRACKER_ABI,
      signer
    );

    // Convert backend_id (hex string) to bytes
    // backendId is already in hex format: "0xdb28ec4e..."
    const nonceBytes = ethers.getBytes(backendId);

    console.log("Submitting contribution:", {
      type: contributionType,
      points,
      proofUrl,
      nonce: backendId,
    });

    // Call smart contract
    const tx = await contract.submitContribution(
      contributionType,
      points,
      proofUrl,
      nonceBytes
    );

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log("Transaction confirmed:", receipt.hash);

    // Parse event to get contributionId
    let contributionId = 0;
    
    // Find ContributionSubmitted event
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        
        if (parsed && parsed.name === "ContributionSubmitted") {
          contributionId = Number(parsed.args.contributionId);
          console.log("Contribution ID from event:", contributionId);
          break;
        }
      } catch (e) {
        // Skip logs that don't match our interface
        continue;
      }
    }

    return {
      txHash: receipt.hash,
      contributionId,
    };
  } catch (error: any) {
    console.error("Smart contract submission error:", error);
    
    // Parse common errors
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected by user");
    } else if (error.message?.includes("NonceAlreadyUsed")) {
      throw new Error("This contribution has already been submitted to the blockchain");
    } else if (error.message?.includes("InvalidPointsAmount")) {
      throw new Error("Invalid points amount - exceeds maximum allowed");
    } else if (error.message?.includes("InvalidProofUrl")) {
      throw new Error("Invalid proof URL - check length and format");
    } else if (error.message?.includes("Pausable: paused")) {
      throw new Error("Contract is currently paused - please try again later");
    } else if (error.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds for gas fee");
    } else if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error - please check your connection");
    }
    
    // Generic error
    throw new Error(error.reason || error.message || "Smart contract submission failed");
  }
};

/**
 * Get base points for a contribution type from contract
 * @param provider Ethers BrowserProvider or JsonRpcProvider
 * @param contributionType Contract enum value (0-5)
 * @returns Base points for this type
 */
export const getBasePointsFromContract = async (
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider,
  contributionType: number
): Promise<number> => {
  try {
    const contract = new ethers.Contract(
      CONTRIBUTION_TRACKER_ADDRESS,
      CONTRIBUTION_TRACKER_ABI,
      provider
    );

    const points = await contract.getBasePoints(contributionType);
    return Number(points);
  } catch (error) {
    console.error("Error fetching base points:", error);
    return DEFAULT_POINTS[contributionType] || 0;
  }
};

/**
 * Get points to token conversion ratio from contract
 * @param provider Ethers BrowserProvider or JsonRpcProvider
 * @returns Current conversion ratio
 */
export const getConversionRatioFromContract = async (
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider
): Promise<number> => {
  try {
    const contract = new ethers.Contract(
      CONTRIBUTION_TRACKER_ADDRESS,
      CONTRIBUTION_TRACKER_ABI,
      provider
    );

    const ratio = await contract.pointsToTokenRatio();
    return Number(ratio);
  } catch (error) {
    console.error("Error fetching conversion ratio:", error);
    return DEFAULT_POINTS_TO_TOKEN_RATIO;
  }
};

/**
 * Get contribution details from contract
 * @param provider Ethers BrowserProvider or JsonRpcProvider
 * @param contributionId On-chain contribution ID
 * @returns Contribution details
 */
export const getContributionFromContract = async (
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider,
  contributionId: number
): Promise<any> => {
  try {
    const contract = new ethers.Contract(
      CONTRIBUTION_TRACKER_ADDRESS,
      CONTRIBUTION_TRACKER_ABI,
      provider
    );

    const contribution = await contract.getContribution(contributionId);
    return contribution;
  } catch (error) {
    console.error("Error fetching contribution:", error);
    throw error;
  }
};