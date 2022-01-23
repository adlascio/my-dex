/** Connect to Moralis server */
const serverUrl = "SERVER_URL";
const appId = "APP_ID";
Moralis.start({ serverUrl, appId });

if (typeof window.ethereum !== 'undefined') {
    
    console.log('MetaMask is installed!');
    getChainId();
  }

let currentTrade = {};
let currentSelectedSide;
let tokens;
let user;
let chain;
let selectedTokenErc20;

if(user){
    init();
}

async function init(){
    await Moralis.initPlugins();
    await Moralis.enableWeb3();
    await listAvailableTokens();
    await loadAssets();
    if(chain === "rinkeby" || chain === "polygon" || chain === "bsc"){
        document.getElementById('swap_button').disabled = false;
        document.getElementById('submit_transfer').disabled = false;
    }
    
}

async function listAvailableTokens(){
    console.log('chain', chain);
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain:chain
    })
    tokens = result.tokens;
    console.log("tokens",result)
    let parent = document.getElementById("token_list");
    for (const address in tokens){
        let token = tokens[address];
        let div = document.createElement("div");
        div.setAttribute("data-address", address)
        div.className = "token_row";
        let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        div.onclick = (() => selectToken(address));
        parent.appendChild(div);
    }
}

async function selectToken(address){
    closeModal();
    currentTrade[currentSelectedSide] = tokens[address];
    renderInterface();
    getQuote();
}

function renderInterface(){
    if(currentSelectedSide === "from"){
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    } else {
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
    
}

async function login() {
  if (!user) {
   try {
      user = await Moralis.authenticate({ signingMessage: "My DEX Authentication" })
      init();
      console.log('user logged',user)
      document.getElementById("login_button").innerHTML = user.attributes.accounts[0];
   } catch(error) {
     console.log(error)
   }
  }
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

function openModal(side){
    currentSelectedSide = side;
    document.getElementById("token_modal").style.display = "block";
}
function closeModal(){
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote(){
    console.log('quote called')
    if(!currentTrade || !currentTrade.to || !document.getElementById("from_amount").value) return ;
    let amount = Number(
        document.getElementById("from_amount").value * 10**currentTrade.from.decimals
    )

    const quote = await Moralis.Plugins.oneInch.quote({
        chain: chain,
        fromTokenAddress:currentTrade.from.address,
        toTokenAddress:currentTrade.to.address,
        amount: amount
    })
    console.log('quote', quote);
    document.getElementById("estimated_gas").innerHTML = quote.estimatedGas;
    document.getElementById("to_amount").value = quote.toTokenAmount / (10**quote.toToken.decimals)

}

async function trySwap(){
    let address = Moralis.User.current().get("ethAddress");
    let amount = Number(
        document.getElementById("from_amount").value * 10**currentTrade.from.decimals
    )
    if(currentTrade.from.symbol !== "ETH"){
        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
            chain: chain,
            fromTokenAddress: currentTrade.from.address,
            fromAddress: address,
            amount: amount
        })
        console.log('allowance', allowance);
        if(!allowance){
            console.log('asking to approve')
            await Moralis.Plugins.oneInch.approve({
                chain: chain,
                fromTokenAddress: currentTrade.from.address,
                fromAddress: address,
            })
        }
    }
    let receipt = await doSwap(address, amount);
}

function doSwap(userAddress, amount){
    return Moralis.Plugins.oneInch.hasAllowance({
        chain: chain,
        fromTokenAddress: currentTrade.from.address,
        toTokenAddress: currentTrade.to.address,
        fromAddress: userAddress,
        amount: amount,
        slippage: 1,
    })
}

async function getChainId() {
    const result = await ethereum.request({method: 'eth_chainId'});
    switch (result){
        case '0x4':
            chain = "rinkeby"
            break;
        case "0x38":
            chain = "bsc"
            break;
        case "0x89":
            chain = "polygon"
            break;
        default:
            chain = result;
            alert("This network is not supported. Only available for BSC, Poligon and Rinkeby.")
            break;
    }
    
}

const filterTokens = () => {
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById('token_input');
    filter = input.value.toUpperCase();
    ul = document.getElementById("token_list");
    li = ul.getElementsByClassName('token_row');
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("span")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}

async function loadAssets(){
    let options = {
        chain:chain,
        address:user.address,
    }
    const result = await Moralis.Web3API.account.getNativeBalance(options);
    const result2 = await Moralis.Web3API.account.getNFTs(options);
    let tokenBalances = await Moralis.Web3API.account.getTokenBalances(options);
    let nativeBalance = result.balance;
    let nfts = result2.result;
    document.getElementById("native_balance").innerHTML = nativeBalance/(10**18);
    console.log(nativeBalance/(10**18));
    let balanceParent = document.getElementById("balances_list");
    for (const i in tokenBalances){
        let token = tokenBalances[i];
        let balance = token.balance/(10**token.decimals)
        let balanceOption = document.createElement("option");
        balanceOption.name = "balance_row";
        balanceOption.value = token.token_address;
        balanceOption.id = token.token_address;
        balanceOption.setAttribute("data-decimals", token.decimals)
        let html = `
        ${token.name} - ${balance.toFixed(4)} ${token.symbol}
        `
        balanceOption.innerHTML = html;
        balanceParent.appendChild(balanceOption);
        //name symbol balance decimals
    }
    for (const i in nfts){
        let nft = nfts[i];
        let nftOption = document.createElement("option");
        let nftsParent = document.getElementById("nfts_list");
        nftOption.className = "nft_row";
        console.log("nft",nft)
        nftOption.value = nft.token_address;
        nftOption.setAttribute("data-tokenID", nft.token_id)
        let html = `
        ${nft.name} - ${nft.token_id}
        `
        nftOption.innerHTML = html;
        nftsParent.appendChild(nftOption);
        //name symbol balance decimals
    }
}

async function submitTransfer(){
    let type = document.querySelector('input[name="options"]:checked').id;

    switch(type){
        case "native":
            const transactionNative = await Moralis.transfer({
                type:"native",
                amount: Moralis.Units.ETH(document.getElementById("amount_input_native").value),
                receiver: document.getElementById("receiver_input_native").value
            })
            const resultNative = await transactionNative.wait()
            console.log("native transaction result",resultNative);
            break;
        case "erc20":
            var contractAddressErc20 = $( "#balances_list" ).val();
            var decimals = document.getElementById(contractAddressErc20).attributes['data-decimals'].value;
            const transactionErc20 = await Moralis.transfer({
                type:"erc20",
                amount: Moralis.Units.ETH(document.getElementById("amount_input_erc20").value, decimals),
                receiver: document.getElementById("receiver_input_erc20").value,
                contractAddress: contractAddressErc20
            })
            const resultErc20 = await transactionErc20.wait()
            console.log("erc20 transaction result",resultErc20);
            break;
            case "erc721":
                var contractAddressErc721 = $( "#nfts_list" ).val();
                console.log("address", contractAddressErc721)
                var decimals = document.getElementById(contractAddressErc721).attributes['data-tokenID'].value;
                const transactionErc721 = await Moralis.transfer({
                    type:"erc721",
                    amount: Moralis.Units.ETH(document.getElementById("amount_input_erc721").value, decimals),
                    receiver: document.getElementById("receiver_input_erc721").value,
                    contractAddress: contractAddressErc721
                })
                const resultErc721 = await transactionErc721.wait()
                console.log("erc721 transaction result",resultErc721);
                break;
            case "erc1155":
                const transactionErc1155 = await Moralis.transfer({
                    type:"erc1155",
                    amount: document.getElementById("amount_input_erc1155").value,
                    receiver: document.getElementById("receiver_input_erc1155").value,
                    contractAddress: document.getElementById("address_input_erc1155").value,
                    tokenId: document.getElementById("tokenId_input_erc1155").value,
                })
                const resultErc1155 = await transactionErc1155.wait()
                console.log("erc1155 transaction result",resultErc1155);
                break;
        default:
            console.log('default');
            break;
    }
}

document.getElementById("from_token_select").onclick = (() => {
    if(user){
        openModal("from")
    } else {
        alert('Please, sign in first.')
    }
    
});
document.getElementById("to_token_select").onclick = (() => {
    if(user){
        openModal("to")
    } else {
        alert('Please, sign in first.')
    }
});
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("login_button").onclick = (() => {
    if(user){
        console.log(user)
       logOut();
       window.location.reload()
    } else{
        login();
    }
});
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;
ethereum.on('chainChanged', (_chainId) => {
    window.location.reload()
});
document.getElementById("token_input").onkeyup = filterTokens;
document.getElementById("submit_transfer").onclick = submitTransfer;
document.getElementById("erc20").onclick = (() => {
    document.getElementById("erc20_form").style.display = "block";
    document.getElementById("native_form").style.display = "none";
    document.getElementById("erc721_form").style.display = "none";
    document.getElementById("erc1155_form").style.display = "none";
});
document.getElementById("native").onclick = (() => {
    document.getElementById("native_form").style.display = "block";
    document.getElementById("erc721_form").style.display = "none";
    document.getElementById("erc1155_form").style.display = "none";
    document.getElementById("erc20_form").style.display = "none";
});
document.getElementById("erc721").onclick = (() => {
    document.getElementById("erc721_form").style.display = "block";
    document.getElementById("erc1155_form").style.display = "none";
    document.getElementById("erc20_form").style.display = "none";
    document.getElementById("native_form").style.display = "none";
});
document.getElementById("erc1155").onclick = (() => {
    document.getElementById("erc1155_form").style.display = "block";
    document.getElementById("erc20_form").style.display = "none";
    document.getElementById("native_form").style.display = "none";
    document.getElementById("erc721_form").style.display = "none";
});
document.getElementById("balances_list").onchange = (() => {
     
})
