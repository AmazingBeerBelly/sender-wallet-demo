import { useCallback, useEffect, useState } from "react";

import NearWalletSelector from "@near-wallet-selector/core";
import { setupSender } from "@near-wallet-selector/sender";
import { Contract } from 'near-api-js';
import { parseNearAmount } from "near-api-js/lib/utils/format";

import './App.css';
import senderLogo from './assets/sender-icon.png'

// account creation costs 0.00125 NEAR for storage, 0.00000000003 NEAR for gas
// https://docs.near.org/docs/api/naj-cookbook#wrap-and-unwrap-near
const FT_MINIMUM_STORAGE_BALANCE = parseNearAmount('0.00125');

const contractId = 'dev-1635836502908-29682237937904'
const wNearContractId = 'wrap.testnet'
const receiverId = 'amazingbeerbelly-2.testnet'

function App() {
  const [nearWalletSelector, setNearWalletSelector] = useState(null)
  const [near, setNear] = useState(null)
  const [theLastOne, setTheLastOne] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    const initNearWalletSelector = async () => {
      const selector = await NearWalletSelector.init({
        network: 'testnet',
        contractId,
        wallets: [
          setupSender({ iconUrl: senderLogo }),
        ]
      })
      setNearWalletSelector(selector)
    }

    initNearWalletSelector()
  }, [])

  useEffect(() => {
    if (!nearWalletSelector) {
      return;
    }

    const subscription = nearWalletSelector.on("accountsChanged", (e) => {
      console.log('nearWalletSelector accountsChanged: ', e)
      setAccountId(e.accounts[0].accountId)
      setNear(window.near)
    });

    return () => subscription.remove();
  }, [nearWalletSelector]);

  useEffect(() => {
    setTimeout(() => {
      if (window && window.near) {
        if (window.near.isSignedIn()) {
          setNear(window.near)
          setAccountId(window.near.accountId)
          
          window.near.on('accountChanged', (newAccountId) => {
            console.log('newAccountId: ', newAccountId);
          });
          
          window.near.on('rpcChanged', (rpc) => {
            console.log('rpc: ', rpc);
          });
        }
      }
    }, 500)
  }, [window])

  const connect = useCallback(async () => {
    if (nearWalletSelector) {
      nearWalletSelector.show()
    }
  }, [nearWalletSelector])

  const sayHi = useCallback(async () => {
    const contract = new Contract(near.__account, contractId, {
      viewMethods: ['whoSaidHi'],
      changeMethods: ['sayHi'],
    });

    const res = await contract.sayHi();
    console.log('Say Hi response: ', res);
  }, [near])

  const whoSaidHi = useCallback(async () => {
    /**
     * Using contract instance
     */
    // const contract = new Contract(near.__account, contractId, {
    //   viewMethods: ['whoSaidHi'],
    //   changeMethods: ['sayHi'],
    // });

    // const res = await contract.whoSaidHi();
    // console.log('Say Hi response: ', res);

    /**
     * Using view function call
     */
     const res = await near.account().viewFunction(contractId, 'whoSaidHi')

     console.log('Who Saied Hi response: ', res);
     setTheLastOne(res);
  }, [near])

  const transferNear = useCallback(async () => {
    const res = await near.sendMoney({ receiverId: 'amazingbeerbelly-2.testnet', amount: parseNearAmount('0.1') })
    console.log('transfer near response: ', res)
  }, [near])

  const storageDeposit = useCallback(async () => {
    const res = await near.account().viewFunction(
      wNearContractId,
      'storage_balance_of',
      { "account_id": near.accountId },
    )
    if (!res.error) {
      console.log('res: ', res)
      if (res.total !== FT_MINIMUM_STORAGE_BALANCE) {
        const res = await near.signAndSendTransaction({
          receiverId: wNearContractId,
          actions: [{
            methodName: 'storage_deposit',
            args: {
              registration_only: true
            },
            deposit: FT_MINIMUM_STORAGE_BALANCE,
          }]
        })
    
        console.log('Storage Deposit response: ', res)
      }
    }
  }, [near])

  const swapNear = useCallback(async () => {
    const res = await near.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [{
        methodName: 'near_deposit',
        args: {},
        deposit: parseNearAmount('0.1'),
      }]
    })

    console.log('Swap near to wnear response: ', res)
  }, [near])

  const transferWNear = useCallback(async () => {
    const res = await near.signAndSendTransaction({
      receiverId: wNearContractId,
      actions: [
        {
          methodName: 'ft_transfer',
          args: {
            receiver_id: receiverId,
            amount: parseNearAmount('0.1'),
          },
          deposit: '1',
        }
      ]
    })

    console.log('Send wNEAR response: ', res);
  }, [near])

  const multipleActions = useCallback(async () => {
    const actions = [
      {
        methodName: 'near_deposit',
        args: {},
        deposit: parseNearAmount('0.1'),
      },
      {
        methodName: 'ft_transfer',
        args: {
          receiver_id: receiverId,
          amount: parseNearAmount('0.1'),
        },
        deposit: '1',
      }
    ]

    const res = await near.signAndSendTransaction({
      receiverId: wNearContractId,
      actions,
    })

    console.log('Multiple actions response: ', res);
  }, [near])

  const multipleTransactions = useCallback(async () => {
    const transactions = [
      {
        receiverId: wNearContractId,
        actions: [{
          methodName: 'near_deposit',
          args: {},
          deposit: parseNearAmount('0.1'),
        }]
      },
      {
        receiverId: wNearContractId,
        actions: [{
          methodName: 'ft_transfer',
          args: {
            receiver_id: receiverId,
            amount: parseNearAmount('0.1'),
          },
          deposit: '1',
        }]
      }
    ]

    const res = await near.requestSignTransactions({ transactions })

    console.log('Multiple transactions response: ', res);
  }, [near])

  const signOut = useCallback(async () => {
    const res = await near.disconnect({ contractId })
    console.log('sign out response: ', res)
    setNear(null)
    setAccountId('')
  }, [near])

  return (
    <div style={{ margin: '100px' }}>
      {
        (!accountId) ? (
          <button onClick={connect}>Connect</button>
        ) : (
          <div>
            <div>
              account id: {accountId}
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={sayHi}>Say Hi</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={whoSaidHi}>Who Said Hi</button>
              <span style={{ marginLeft: '30px' }}>Who is the last one said hi: {theLastOne}</span>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={transferNear}>Transfer Near</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={storageDeposit}>Storage Deposit</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={swapNear}>Swap Near To wNear</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={transferWNear}>Transfer wNear</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={multipleActions}>Send one transaction with multiple actions</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={multipleTransactions}>Send multiple transactions</button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={signOut}>Sign out</button>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
