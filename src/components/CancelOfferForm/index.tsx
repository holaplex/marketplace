import { useForm } from 'react-hook-form'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { toast } from 'react-toastify'
import {
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { Marketplace, Nft, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

interface CancelOfferFormProps {
  offer: Offer;
  nft?: Nft;
  marketplace: Marketplace;
  refetch: (variables?: Partial<OperationVariables> | undefined) => Promise<ApolloQueryResult<_>>;
}

const {
    createCancelInstruction,
    createCancelBidReceiptInstruction,
    createWithdrawInstruction,
  } = AuctionHouseProgram.instructions

const CancelOfferForm = ({ offer, nft, marketplace, refetch }: CancelOfferFormProps) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { formState: { isSubmitting }, handleSubmit } = useForm()

  const cancelOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer || !nft) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address);
    const authority = new PublicKey(marketplace.auctionHouse.authority);
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    );
    const tokenMint = new PublicKey(nft.mintAddress);
    const receipt = new PublicKey(offer.address)
    const buyerPrice = offer.price.toNumber();
    const tradeState = new PublicKey(offer.tradeState);
    const owner = new PublicKey(nft.owner.address);
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint);

    const [
      tokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      owner,
    )

    const [
      escrowPaymentAccount,
      escrowPaymentBump
    ] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(
      auctionHouse,
      publicKey,
    );

    const txt = new Transaction();

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      tokenMint,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      tradeState,
    };

    const cancelInstructionArgs = {
      buyerPrice,
      tokenSize: 1,
    };

    const cancelBidReceiptInstructionAccounts = {
      receipt: receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };

    const cancelBidInstruction = createCancelInstruction(
      cancelInstructionAccounts,
      cancelInstructionArgs
    );

    const cancelBidReceiptInstruction = createCancelBidReceiptInstruction(
      cancelBidReceiptInstructionAccounts
    )

    const withdrawInstructionAccounts = {
      receiptAccount: publicKey,
      wallet: publicKey,
      escrowPaymentAccount,
      auctionHouse,
      authority,
      treasuryMint,
      auctionHouseFeeAccount,
    }

    const withdrawInstructionArgs = {
      escrowPaymentBump,
      amount: buyerPrice,
    }

    const withdrawInstruction = createWithdrawInstruction(
      withdrawInstructionAccounts,
      withdrawInstructionArgs,
    )

    txt.add(cancelBidInstruction).add(cancelBidReceiptInstruction).add(withdrawInstruction);

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined;

    try {
      signed = await signTransaction(txt);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    let signature: string | undefined = undefined;

    try {
      toast('Sending the transaction to Solana.');

      signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction(signature, 'confirmed');

      await refetch();

      toast.success('The transaction was confirmed.');
    } catch(e: any) {
      toast.error(e.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(
        cancelOfferTransaction
      )}
    >
      <Button
        loading={isSubmitting}
        htmlType='submit'
        size={ButtonSize.Small}
        type={ButtonType.Primary}
      >
        Cancel Offer
      </Button>
    </form>
  )
}
export default CancelOfferForm;