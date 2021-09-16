import useSWR from 'swr'
import Image from 'next/image'
import { ethers } from 'ethers'
import { Biconomy } from '@biconomy/mexa'
import slugDark from '@images/slug-dark.png'
import slugLight from '@images/slug-light.png'
import snailDark from '@images/snail-dark.png'
import snailLight from '@images/snail-light.png'
import ProgressBar from '@/components/ProgressBar'
import { FC, useEffect, useMemo, useState } from 'react'
import LoadingIndicator from '@/components/LoadingIndicator'
import { PopulatedTransaction } from '@ethersproject/contracts'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import TwitterWalletButton from '@/components/TwitterWalletButton'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { Wagmipet__factory as WAGMIpet, Wagmipet as Wagmiabi } from '@/contracts'
import { useTheme } from 'next-themes'

const PetView: FC<{ tokenID: number; name: string }> = ({ tokenID, name }) => {
	const [petLight, petDark] = tokenID % 2 == 0 ? [snailLight, snailDark] : [slugLight, slugDark]
	const { resolvedTheme } = useTheme()
	const [web3, setWeb3] = useState<ethers.providers.Web3Provider>(null)
	const [userAddress, setUserAddress] = useState<string>('')
	const [biconomy, setBiconomy] = useState<Biconomy>(null)

	useEffect(() => {
		if (!web3) {
			setUserAddress('')
			return
		}

		web3.getSigner().getAddress().then(setUserAddress)
	}, [web3])

	const contract = useMemo<Wagmiabi>(() => WAGMIpet.connect(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, biconomy ? biconomy.getSignerByAddress(userAddress) : new ethers.providers.JsonRpcProvider(`https://polygon-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`)), [web3, biconomy])

	const { data: status } = useSWR(
		() => web3 && `${tokenID}-status`,
		() => contract.getStatus(tokenID),
		{ revalidateOnFocus: false }
	)
	const { data: stats, mutate: mutateStats } = useSWR(
		() => web3 && `${tokenID}-stats`,
		() => contract.getStats(tokenID).then(stats => stats.map(stat => stat.toNumber())),
		{ revalidateOnFocus: false, refreshInterval: 1000 * 60 }
	)

	const interactWithPet = async (getTransaction: Promise<PopulatedTransaction>) => {
		const { data } = await getTransaction

		const provider = biconomy.getEthersProvider()

		mutateStats(null, false)

		const tx = await provider.send('eth_sendTransaction', [{ data, from: userAddress, to: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, signatureType: 'EIP712_SIGN' }]).catch(error => {
			const message = JSON.parse(error?.body || error?.error?.body || '{}')?.error?.message?.split('execution reverted: ')?.[1]

			if (message) {
				mutateStats(null, true)

				throw alert(message)
			}

			alert('Something went wrong!')

			throw error
		})

		provider.once(tx, () => mutateStats(null, true))

		window.open(`https://polygonscan.com/tx/${tx}`)
	}

	if (!web3)
		return (
			<div className="space-y-2 flex flex-col items-center justify-center">
				<ConnectWalletButton className="text-3xl p-4 border-4 border-current text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400" web3={web3} setWeb3={setWeb3} setBiconomy={setBiconomy}>
					Connect Wallet
				</ConnectWalletButton>
				<p className="dark:text-white text-xl">
					or{' '}
					<TwitterWalletButton web3={web3} setWeb3={setWeb3} setBiconomy={setBiconomy} className="underline">
						log in with Twitter
					</TwitterWalletButton>
					.
				</p>
			</div>
		)

	if (!userAddress || !status || !stats) return <LoadingIndicator />

	return (
		<div className="w-full max-w-screen-md mx-4 md:mx-0 space-y-10">
			<h1 className="text-7xl dark:text-white mb-8">{name}</h1>
			<Image className={stats?.[0] == 1 ? 'animate-dance' : 'transform rotate-180 scale-x-[-1]'} width={petLight.width / 2} height={petLight.height / 2} src={resolvedTheme == 'dark' ? petDark : petLight} placeholder="blur" />
			<div className="p-4 border-4 border-current text-black dark:text-white text-2xl space-x-2 w-full">
				<span className="animate-blink">&gt;</span>
				<span>{status}</span>
			</div>
			<div className="space-y-4">
				<div>
					<p className="text-4xl dark:text-white">Happiness</p>
					<ProgressBar value={stats?.[3]} />
				</div>
				<div>
					<p className="text-4xl dark:text-white">Cleanliness</p>
					<ProgressBar value={stats?.[2]} />
				</div>
				<div>
					<p className="text-4xl dark:text-white">Hunger</p>
					<ProgressBar value={stats?.[1]} />
				</div>
				<div>
					<p className="text-4xl dark:text-white">Sleepiness</p>
					<ProgressBar value={stats?.[4]} />
				</div>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<button onClick={() => interactWithPet(contract.populateTransaction.clean(tokenID))} className="text-3xl py-2 px-6 border-4 border-current text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400 disabled:text-gray-400 dark:disabled:text-gray-500" disabled={!biconomy}>
					Clean
				</button>
				<button onClick={() => interactWithPet(contract.populateTransaction.feed(tokenID))} className="text-3xl py-2 px-6 border-4 border-current text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400 disabled:text-gray-400 dark:disabled:text-gray-500" disabled={!biconomy}>
					Feed
				</button>
				<button onClick={() => interactWithPet(contract.populateTransaction.play(tokenID))} className="text-3xl py-2 px-6 border-4 border-current text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400 disabled:text-gray-400 dark:disabled:text-gray-500" disabled={!biconomy}>
					Play
				</button>
				<button onClick={() => interactWithPet(contract.populateTransaction.sleep(tokenID))} className="text-3xl py-2 px-6 border-4 border-current text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400 disabled:text-gray-400 dark:disabled:text-gray-500" disabled={!biconomy}>
					Sleep
				</button>
			</div>
		</div>
	)
}

export const getServerSideProps: GetServerSideProps = async ({ params: { tokenID } }: GetServerSidePropsContext) => {
	const web3 = new ethers.providers.InfuraProvider(process.env.NEXT_PUBLIC_NETWORK_ID, process.env.NEXT_PUBLIC_INFURA_ID)
	const contract = WAGMIpet.connect(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, web3)

	try {
		const name = await contract.getName(tokenID as string)

		return { props: { tokenID, name } }
	} catch {
		return { notFound: true }
	}
}

export default PetView
