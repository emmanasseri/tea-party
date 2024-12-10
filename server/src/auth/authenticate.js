const { ethers } = require("ethers");

function verifySignature(address, signature, originalMessage) {
  try {
    const signerAddr = ethers.utils.verifyMessage(originalMessage, signature);
    return signerAddr === address;
  } catch (error) {
    return false;
  }
}
module.exports = { verifySignature };
