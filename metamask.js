// (C) 2021 Jacob MacMillan Software Inc., all rights reserved
// Must have the following in any HTML file that uses this:
// <script src="https://cdn.ethers.io/lib/ethers-5.0.umd.min.js" type="text/javascript"></script>
'use strict';

let jmsEthLibrary = {}

// Connect metamask
/*
 * Arguments:
 * function to run when network has changed (optional): function (chainId)
 * function to run when wallet has changed (optional): function (accounts)
 * 
 * Returns the following:
 * [accounts]: metamask connected
 * null: metamask not found
 * 1: connection already pending
 * 2: metamask found, but failed to connect for an unknown reason
 */
jmsEthLibrary.connectMetamask = async (onNetworkChange = null, onAccountChange = null) => {
  let accounts = [];
  
  // Check if metamask is installed
  // if it is, connect
  if(window.ethereum !== undefined) {
    // Attempt to connect to metamask
    try {
      accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch(e) {
      if(e.code === -32002) {
        return 1;
      }
      return 2;
    }

    jmsEthLibrary.ethProvider = new window.ethers.providers.Web3Provider(window.ethereum);
    jmsEthLibrary.ethSigner = jmsEthLibrary.ethProvider.getSigner();
  } else {
    return null;
  }
  
  // Check if we are connected to ethereum
  if(!window.ethereum.isConnected()) {
    return 1;
  }
  
  if(onNetworkChange === 'function') {
    window.ethereum.on('chainChanged', onNetworkChange);
  }
  
  if(onAccountChange === 'function') {
    window.ethereum.on('accountsChanged', onAccountChange);
  }
  
  return accounts;
  
}

// document.getElementById("metamaskLinkButton").addEventListener("click", jmsEthLibrary.connectMetamask);


/*********
 * Optional functions
 * 
 * Uncomment any function the client wants/needs
 * by adding a single '/' before the '/*' that comments out the function
 **********/

// Function to create a contract object
/*
 * Arguments:
 * adress of contract: string (accepts both ENS names and addresses)
 * abi of contract: array
 * 
 * Returns
 * null: if address or ABI are invalid
 * a contract object: on success
 */
//*
jmsEthLibrary.getEthContract = async (address, abi) => {
  if(typeof address !== 'string' && address.length < 2) { // Not actually sure if there are any valid 2 character ENS names, but just in case. Seems unlikely though
    console.error(`Invalid contract address: ${address}`);
    return;
  }
  
  if(typeof abi !== 'object') {
    console.error(`Invalid contract abi: ${abi}`);
    return;
  }
  
  return new window.ethers.Contract(address, abi, jmsEthLibrary.ethSigner);
} //*/

// Function to send ETH
/*
 * Arguments
 * address to send ETH to: string (accpets both ENS names and addresses)
 * amount of ETH to send, specified in wei: number
 * 
 * Ruterns
 * null: invalid recipient
 * object containing transaction results: on success
 */
/*
jmsEthLibrary.sendEth = async (to, amount) => {
  if(typeof to !== 'string' && to.length < 2) { // Not actually sure if there are any valid 2 character ENS names, but just in case. Seems unlikely though
    console.error(`Invalid recipient address: ${to}`);
    return;
  }
  
  const tx = jmsEthLibrary.ethSigner.sendTransaction({
    to: to,
    value: amount
  });
  
  return tx;
} //*/

// Function to sign a message with user's private key
/*
window.handleSignMessage = ({publicAddress, message}, callback = undefined) => {
  return new Promise((resolve, reject) =>
    window.web3.eth.personal.sign(
      window.web3.utils.fromUtf8(message),
      publicAddress,
      (err, signature) => {
        if(err) return reject(err);
        if(callback) callback(undefined, publicAddress, signature);
        return resolve({publicAddress, signature});
      }
    )
  ).catch((err) => { callback(err, 0, 0) });
} //*/

// This comment must be second to last line
window.eth = jmsEthLibrary;
