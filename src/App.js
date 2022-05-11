import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import idl from "./idl.json";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import Wallet from "@project-serum/sol-wallet-adapter";
import * as w3 from "@solana/web3.js";
import kp from "./keypair.json";
import { Button, Header, Image, Modal, Form } from "semantic-ui-react";

const bs58 = require("bs58");

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

const connection = new Connection(network, opts.preflightCommitment);

const wallet = new Wallet("https://www.sollet.io", network);

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifs, setGifs] = useState([]);
  const [present, setPresent] = useState(false);
  const [pub, setPub] = useState(null);
  const [amount, setAmount] = useState(10);
  const [openModal, setOpenModal] = useState(false);
  const [checkIndex, setCheckIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkSolanaWalletExists = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Solana wallet Found!!");
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
      // await wallet.connect();
      const response = await solana.connect();
      console.log("Key is: ", response.publicKey.toString());
      console.log(response);
      setWalletAddress(response.publicKey);
      setPub(response);
    }
  };

  const disconnectWallet = async () => {
    const { solana } = window;

    if (solana) {
      console.log("Wallet is found");
      const response = await solana.disconnect();
      console.log("Key is: ", response);
      setWalletAddress(response);
      // setWalletAddress(response.publicKey);
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
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const set = (id) => {
    setCheckIndex(id);
    setOpenModal(true);
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
                <img src={gif.gifLink} alt={gif.gifLink} />
                <br />
                <button
                  style={{ float: "left" }}
                  className="cta-button connect-wallet-button"
                  onClick={() => upvoteGif(index)}
                >
                  Upvote {present && gif.upvotes.words[0]}
                </button>
                <br />
                { loading ? <Button primary loading>Tip</Button> : <Button primary onClick={() => setOpenModal(true)}>Tip</Button>}
                {/* // </button> : <button
                //   style={{ float: "left" }}
                //   className="cta-button submit-gif-button"
                //   onClick={() => set(index)}
                //   // onClick={() => setOpenModal(true)}
                // >
                //   Tip 
                // </button>} */}
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const airDrop = async () => {
    try {
      const double = LAMPORTS_PER_SOL * 1.5;
      console.log(LAMPORTS_PER_SOL);
      const airdropSignature = await connection.requestAirdrop(
        walletAddress,
        double
      );
      const result = await connection.confirmTransaction(airdropSignature);
      console.log(result);
    } catch (error) {
      console.log("Couldnt airdrop ", error);
    }
  };

  const payUser = async () => {
    let index = checkIndex;
    try {
      setOpenModal(false);
      setLoading(true);
      console.log(gifs[index].userAddress.toString());
      const toAddress = gifs[index].userAddress;
      console.log(typeof walletAddress, walletAddress);
      let walletAccountInfo = await connection.getAccountInfo(
        baseAccount.publicKey
      );
      console.log(walletAccountInfo);
      console.log("Balance before payment", walletAccountInfo.lamports);

      let recentBlockhash = await connection.getRecentBlockhash();
      let manualTransaction = new Transaction({
        recentBlockhash: recentBlockhash.blockhash,
        feePayer: walletAddress,
      });
      manualTransaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: walletAddress,
          toPubkey: toAddress,
          lamports: LAMPORTS_PER_SOL * amount,
        })
      );
      let sign = await window.solana.signTransaction(manualTransaction);
      let signature = await connection.sendRawTransaction(sign.serialize());
      let result = await connection.confirmTransaction(
        signature,
        "myFirstTransaction"
      );
      console.log("sent money", result);
      alert("Tipped Successfully");
      setLoading(false)
    } catch (error) {
      console.log("Couldnt pay ", error);
      setOpenModal(false);
    }
  };

  const upvoteGif = async (index) => {
    try {
      console.log(index);
      console.log(gifs[index].upvotes.words[0]);
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
  };

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

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching gif list...");

      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <Modal
        onClose={() => setOpenModal(false)}
        onOpen={() => setOpenModal(true)}
        open={openModal}
      >
        <Modal.Header>Tip the user</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Header>Tip</Header>
            <Form>
              <Form.Field>
                <label>Tip Amount</label>
                <input placeholder="Enter tip amount in SOL" onChange={handleAmountChange} />
              </Form.Field>
            </Form>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button color="black" onClick={() => setOpenModal(false)}>
            Cancel Pay
          </Button>
          <Button
            content="Pay"
            labelPosition="right"
            icon="checkmark"
            onClick={payUser}
            positive
          />
        </Modal.Actions>
      </Modal>
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          {walletAddress && (
            <button
              className="cta-button submit-gif-button"
              style={{ textAlign: "right", float: "right" }}
              onClick={disconnectWallet}
            >
              Logout
            </button>
          )}
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
        {/* <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div> */}
      </div>
    </div>
  );
};

export default App;
