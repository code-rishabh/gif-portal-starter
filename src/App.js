import React, { useEffect, useState } from 'react';
import kp from './keypair.json'
import twitterLogo from './assets/twitter-logo.svg';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import './App.css';


// Constants
const TEST_GIFS = [
  'https://media0.giphy.com/media/j0kP7fOkKQlYsXTO2r/200.webp?cid=ecf05e47r181qx54339rh9f0v16ggvemksmz0wpqnxyycf32&rid=200.webp&ct=g',

  'https://media4.giphy.com/media/H83c2x0NWvFhtgK4V2/200w.webp?cid=ecf05e47r181qx54339rh9f0v16ggvemksmz0wpqnxyycf32&rid=200w.webp&ct=g',

  'https://media2.giphy.com/media/Z9JtPniLKdNzPjsEn6/200w.webp?cid=ecf05e47r181qx54339rh9f0v16ggvemksmz0wpqnxyycf32&rid=200w.webp&ct=g',

  'https://media1.giphy.com/media/dISk854tQqGKHFm88e/200w.webp?cid=ecf05e47m88yat3e7i02jmnm8wjn3c2toox8imh6gxexmak3&rid=200w.webp&ct=g'
]



const TWITTER_HANDLE = 'iamRissu';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// SystemProgram is a reference to solana runtime
const {SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// controls how we want to acknowledge when the transaction is done
const opts = {
  prefLightCommitment: "processed"
}

const App = () => {

  // this function holds the logic for deciding if a phantom wallet is connected or not
  // STATE
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('phantom wallet found!');

          // the solana object gives us a function that will allow us to connect directly with the user's wallet
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );
          // set the user's public key in state to be used later!
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // wallet connected code
  const connectWallet = async () => {
    const { solana } = window;  
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with public key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    setInputValue('');
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
  
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue)
  
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  // create a function getProvider
  const getProvider = () =>{
    const connection =  new Connection(network, opts.prefLightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.prefLightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();
  
    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  // we want to render this UI when the user hasn't connected their wallet
  const renderNotConnectedContainer = () => (
    <button className='cta-button connect-wallet-button' onClick={connectWallet}>
      connect to wallet
    </button>
  );

  // render this when the wallet is connected
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
      if (gifList === null) {
        return (
          <div className="connected-container">
            <button className="cta-button submit-gif-button" onClick={createGifAccount}>
              Do One-Time Initialization For GIF Program Account
            </button>
          </div>
        )
      } 
      // Otherwise, we're good! Account exists. User can submit GIFs.
      else {
        return(
          <div className="connected-container">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendGif();
              }}
            >
              <input
                type="text"
                placeholder="Enter gif link!"
                value={inputValue}
                onChange={onInputChange}
              />
              <button type="submit" className="cta-button submit-gif-button">
                Submit
              </button>
            </form>
            <div className="gif-grid">
              {/* We use index as the key instead, also, the src is now item.gifLink */}
              {gifList.map((item, index) => (
                <div className="gif-item" key={index}>
                  <img src={item.gifLink} />
                </div>
              ))}
            </div>
          </div>
        )
      }
    }

  // When our component first mounts, let's check to see if we have a connected Phantom Wallet
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async () => {
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account);
      setGifList(account.gifList)

    } catch (error){
      console.log("error in getGifList", error);
      setGifList(null);
    }
  }

  useEffect(()=>{
    if(walletAddress){
      console.log('Fetching gif list....');
      getGifList()
    }
  }, [walletAddress]);

  return (
    <div className="App">
      {/* STYLING */}
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Zenitsu Agatsuma</p>
          <p className="sub-text">
            Okay! Let's have a look at some of the savage moves by Zenitsu ✨ ✨
          </p>

          {/* render your connect to wallet button right here */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* shoe gifs if the wallet is connected */}
          { walletAddress && renderConnectedContainer()}

        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
