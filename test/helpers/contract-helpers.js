const { signTypedData_v4 } = require("eth-sig-util");
const { fromRpcSig } = require("ethereumjs-util");

exports.getSignatureFromTypedData = function(privateKey, typedData){

    const signature = signTypedData_v4(
        Buffer.from(privateKey.substring(2, 66), "hex"),
        {
        data: typedData,
        }
    );
    return fromRpcSig(signature);
}

exports.buildPermitParams = function(chainId, asetToken, owner, spender, nonce, value, deadline){
    return {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        domain: {
          name: "Aset Token",
          version: "1",
          chainId: chainId,
          verifyingContract: asetToken,
        },
        message: {
          owner,
          spender,
          value,
          nonce,
          deadline,
        },
    }
}

exports.MAX_UINT_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"