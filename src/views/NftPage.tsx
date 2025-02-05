import {
  Button,
  Img,
  NumberInput,
  NumberInputField,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Ipfs from "../services/ipfs";
import XummAuth from "../features/auth/auth";
import {
  MetaDataEntryType,
  NftOfferType,
  OptionWatchType,
  PinataPinnedFileType,
} from "../utils/types";
import { APP_TEXTS, socketUrl } from "../utils/constant";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import CustomModal from "../components/CustomModal";
import QrXummModal from "../components/QrXummModal";
import useWebSocket from "react-use-websocket";
import NFTCreateOffer from "../services/nftCreateOffer";

function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const OptionView: React.FC<OptionWatchType> = ({ name, value }) => {
  return (
    <>
      <h1 className="font-spaceMono text-[22px] leading-[35.2px] font-bold text-[#858584] mb-2">
        {name}
      </h1>
      <p className="font-workSans text-[16px] leading-[35px] mb-[30px]">
        {value}
      </p>
    </>
  );
};

const NftPage: React.FC = () => {
  const query = useQuery();
  const uri = query.get("uri")!;
  const issuer = query.get("issuer")!;
  const nftTokenId = query.get("nftTokenId")!;
  const [nftDetails, setNftDetails] = React.useState<
    PinataPinnedFileType | undefined
  >();
  const account = useSelector((state: RootState) => state.user.me?.account);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [payLoadURL, setPayloadURL] = React.useState<string | undefined>("");
  const [payLoadQR, setPayloadQR] = React.useState<string | undefined>("");
  const [pricingModalOpen, setPricingModalOpen] =
    React.useState<boolean>(false);
  const [amount, setAmount] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [offers, setOffers] = React.useState<NftOfferType | undefined>();
  const toast = useToast();
  const { sendMessage, lastMessage } = useWebSocket(socketUrl);

  useEffect(() => {
    if (uri) {
      const split = uri.split("/");
      Ipfs.getPinnedFileFromIPFS(split.at(split.length - 1) as string).then(
        (res) => {
          console.log(res);
          setNftDetails(res);
        }
      );
    }
  }, []);

  //Get offers about the NFT if exists
  useEffect(() => {
    sendMessage(NFTCreateOffer.getNFTSellOffer(nftTokenId));
  }, [nftTokenId, isLoading]);

  useEffect(() => {
    if (lastMessage != null) {
      const resultEvent = JSON.parse(lastMessage.data)["result"];
      if (resultEvent && resultEvent.offers && resultEvent.offers.length > 0) {
        console.log(resultEvent.nft_sell_offers, "OFFERS");
        setOffers(resultEvent.offers[0]);
      }
    }
  }, [lastMessage]);

  const genDetails = (details: MetaDataEntryType) => {
    return Object.keys(details.keyvalues).map((key, index) => (
      <OptionView name={key} value={details.keyvalues[key]} key={index} />
    ));
  };

  const GenTheRightButton: React.FC = () => {
    if (offers && offers.owner === account) {
      return (
        <p className="font-workSans text-[16px] leading-[35px] mb-[30px] text-center">
          {APP_TEXTS.youOwnThisNftAndHaveSetAOffers}
        </p>
      );
    } else if (offers && offers.owner != account) {
      return <Button colorScheme="blue">{APP_TEXTS.acceptOffer}</Button>;
    } else if (!offers && issuer === account) {
      return (
        <Button
          colorScheme="blue"
          onClick={() => handleSell()}
          isLoading={isLoading}
        >
          {APP_TEXTS.sell}
        </Button>
      );
    }

    return <Button colorScheme="blue">{APP_TEXTS.buy}</Button>;
  };

  const handleSell = () => {
    setPricingModalOpen(true);
  };

  return (
    <div style={{ marginTop: 70 }}>
      <div>
        <Img
          src={query.get("uri")!}
          loading="lazy"
          boxSize={[150, 250]}
          objectFit="cover"
          display="block"
          marginX="auto"
          marginTop="20px"
        />

        <div id="content" className=" px-10 py-7">
          <div id="description-detail" className="flex flex-row justify-around">
            <div
              id="column1"
              className="flex flex-col max-w-[605px] justify-self-center"
            >
              <div id="title" className="mb-[30px]">
                <h2 className="font-workSans text-[51px] leading-[56px] font-semibold mb-2">
                  {nftDetails?.rows.at(0)?.metadata.name}
                </h2>
              </div>
              <div id="author">
                <OptionView name="Created by" value={issuer} />
              </div>
              <div id="description">
                <OptionView
                  name="Description"
                  value={
                    nftDetails?.rows.at(0)?.metadata.keyvalues != null
                      ? nftDetails.rows.at(0)?.metadata.keyvalues.description!
                      : APP_TEXTS.noDescription
                  }
                />
              </div>
              <div id="details" className="mb-[30px]">
                {nftDetails?.rows.at(0)?.metadata.keyvalues != null
                  ? genDetails(nftDetails.rows.at(0)?.metadata!)
                  : APP_TEXTS.noDetails}
              </div>
              <GenTheRightButton />
            </div>
          </div>
        </div>
      </div>

      {/* Price setting modal */}
      <CustomModal
        title={APP_TEXTS.setPriceNft}
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
      >
        <div>
          <NumberInput
            onChange={(value) => setAmount(value)}
            value={amount}
            data-test-id="nft-set-price-input"
          >
            <NumberInputField placeholder={APP_TEXTS.priceLabel} />
          </NumberInput>

          <Button
            marginTop="8"
            marginBottom="3"
            colorScheme="blue"
            display="block"
            marginX="auto"
            onClick={() => {
              setPricingModalOpen(false);
              if (amount.length > 0) {
                setIsLoading(true);
                XummAuth.createAndSubscribeToNftSellOffer(
                  {
                    Account: account,
                    Amount: amount,
                    Flags: 1,
                    NFTokenID: nftTokenId,
                  },
                  (url) => {
                    setPayloadURL(url);
                  },
                  (qr) => {
                    setPayloadQR(qr);
                  },
                  (modalIsOpen) => {
                    setIsModalOpen(modalIsOpen);
                  },
                  (resolved) => {
                    if ((resolved as any).data.signed) {
                      toast({
                        position: "top-right",
                        title: APP_TEXTS.sellOfferSuccess,
                        description: APP_TEXTS.tsxSuccess,
                        status: "success",
                        duration: 9000,
                        isClosable: true,
                      });
                    }
                    console.log(resolved);
                  }
                ).then(() => {
                  setIsLoading(false);
                });
              }
            }}
          >
            Set Price
          </Button>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={APP_TEXTS.transactionValidation}
      >
        <QrXummModal qr={payLoadQR!} url={payLoadURL!} />
      </CustomModal>
    </div>
  );
};

export default NftPage;
