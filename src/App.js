import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import kp from "./keypair.json";

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  "https://media.giphy.com/media/OsFN08cm1hIQB7EzJn/giphy.gif",
  "https://media.giphy.com/media/Vi6TA5a01GhLVndS7i/giphy.gif",
  "https://media.giphy.com/media/8vtaU284eC6Xrpgg83/giphy.gif",
  "https://media.giphy.com/media/em49D28C8H8DWg7OXO/giphy.gif",
];

const { SystemProgram } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifs, setGifs] = useState([]);
  const [present, setPresent] = useState(false);

  const checkSolanaWalletExists = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log(
            "Solana wallet Found!! yippeee................................................................"
          );
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected to solana wallet: ",
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey);
        }
      } else {
        console.log("Solana Wallet does not exist");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      console.log("Wallet is found");
      const response = await solana.connect();
      console.log("Key is: ", response.publicKey.toString());
      setWalletAddress(response.publicKey);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    const account = await program.account.baseAccount.fetch(
      baseAccount.publicKey
    );

    const tx1 = await program.rpc.addGifs(inputValue, {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    let account1 = await program.account.baseAccount.fetch(
      baseAccount.publicKey
    );
    const total_gifs = account1.totalGifs.toString();
    const allGifs = account1.gifList;
    console.log(total_gifs, allGifs);

    await getGifList();

    // setGifs([...gifs, inputValue]);
    setInputValue("");
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const renderConnectedContainer = () => {
    if (gifs === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createBaseAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } else {
      return (
        <div className="connected-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Enter gif link!"
              onChange={handleChange}
              value={inputValue}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifs.map((gif, index) => (
              <div className="gif-item" key={gif.gifLink}>
                <img src={gif.gifLink} alt={gif.gifLink} /><br />
                <button
                  className="cta-button connect-wallet-button"
                  onClick={() => upvoteGif(index)}
                >Upvote {present && gif.upvotes.words[0]}</button>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const upvoteGif = async(index) => {
    try {
      console.log(index)
      console.log(gifs[index].upvotes.words[0])
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      const tx1 = await program.rpc.upvote(index, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getGifList();
      console.log("Upvoted");

    } catch (error) {
      console.log("Couldnt upvote", error);
    }
  }

  useEffect(() => {
    const onLoad = async () => {
      await checkSolanaWalletExists();
    };
    window.addEventListener("load", onLoad);
    setGifs(TEST_GIFS);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      console.log("Got the account", account);
      console.log(account.totalGifs);
      setGifs(account.gifList);
      setPresent(true);
    } catch (error) {
      console.log(error);
      setGifs(null);
    }
  };

  const createBaseAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      console.log("Ping");

      const tx = await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "Created a base account with the address",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching gif list...");

      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 World Of F1 in GIF</p>
          <p className="sub-text">View upload all the GIFS to F1 ✨</p>
          {!walletAddress && (
            <button
              className="cta-button connect-wallet-button"
              onClick={connectWallet}
            >
              Connect to Wallet
            </button>
          )}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
