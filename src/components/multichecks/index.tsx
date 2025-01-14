/* eslint-disable no-alert */
/* eslint-disable consistent-return */
/* eslint-disable import/no-cycle */
import { FC, useState, useEffect, CSSProperties } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'

import { toast } from 'react-toastify'

import { MultiDataType, SelectedDataType } from '../../pages/your-checks-page'

import { Button } from '../ui/button'

import { StorageWallet } from '../../logic/storage'
import { Coupon } from '../../logic/coupon'

import { fixAmount } from '../../utils/fix-amount'
import { smlAddr } from '../../utils/sml-addr'

import TokenPriceHook from '../../hooks/token-price-hook'
import { useQRCodeDownloader } from '../../hooks/use-qr-code-downloader'
import { useBgTelegram } from '../../hooks/useBgTelegram'
import { useTextTelegram } from '../../hooks/useTextTelegram'
import { useBg2Telegram } from '../../hooks/useBg2Telegram'

import DOWNLOAD from '../../assets/images/checks/download.svg'
import DONE from '../../assets/images/checks/done.svg'
import SHARE from '../../assets/images/checks/share_outline.svg'
import DELETE from '../../assets/images/checks/delete.svg'
import CANCEL from '../../assets/images/checks/cancel.svg'

import s from './multichecks.module.scss'

interface MultichecksProps {
    selectedCheckCard: SelectedDataType;
    setSelectedCheckCard: any;
    isTestnet: boolean;
    isTg: boolean;
}

export const Multichecks: FC<MultichecksProps> = ({ selectedCheckCard, setSelectedCheckCard, isTestnet, isTg }) => {
    const [ isVisible, setIsVisible ] = useState<boolean>(true)
    const [ bal, setBal ] = useState<string>('0')
    const [ info, setInfo ] = useState<MultiDataType | null>(null)
    const [ usage, setUsage ] = useState<number>(0)

    const storageWallet = new StorageWallet()

    const [ tonConnectUI, setOptions ] = useTonConnectUI()
    const cp = new Coupon(tonConnectUI, isTestnet)

    useEffect(() => {
        const getMultiData = () => {
            try {
                const result: MultiDataType[] | null = storageWallet.get(selectedCheckCard?.id)

                if (result) {
                    setInfo(result[0])
                }
            } catch (error) {
                console.error(error)
            }
        }

        getMultiData()
    }, [ selectedCheckCard?.id ])

    useEffect(() => {
        const fetchCouponBalance = async () => {
            if (info && info.address) {
                try {
                    const bl = await Coupon.getSumCoupon(info.address, isTestnet)
                    setBal(bl)
                } catch (error) {
                    console.error('Error fetching coupon balance:', error)
                }
            }
        }
        async function fetchUsage () {
            if (!info?.address) return
            try {
                const res = await cp.getSumActivation(info?.address)
                if (typeof res === 'number') {
                    setUsage(res)
                } else {
                    setUsage(0)
                }
            } catch (error) {
                console.error('Error fetching usage:', error)
            }
        }
        console.log('rerender')
        if (isVisible && info && selectedCheckCard?.id === info.id) {
            fetchCouponBalance()
            fetchUsage()
        }
    }, [ info?.address, selectedCheckCard?.id, isVisible ])

    const handleCancelButtonClick = () => {
        setIsVisible(false)
        setSelectedCheckCard({ id: '', selected: '' })
        setBal('0')
        setInfo(null)
    }

    const handleCopyAddress = () => {
        if (!info) {
            console.error('Something went wrong')
            return
        }

        if (!info.address) {
            console.error('Something went wrong')
            return
        }

        const tempTextArea = document.createElement('textarea')
        tempTextArea.value = info.address
        document.body.appendChild(tempTextArea)
        tempTextArea.select()
        document.execCommand('copy')
        document.body.removeChild(tempTextArea)

        toast.success('Check has been copied to the clipboard')
    }

    const generateQRCodeAndDownload = useQRCodeDownloader(`${window.location.origin}/login?a=${info?.address}` ?? '')

    const handleShareAddress = () => {
        const copyableAddress = window.location.origin + `/login?a=${info?.address}`
        navigator.clipboard.writeText(copyableAddress)
        toast.success('Check has been copied to the clipboard')
    }

    const handleRemove = async () => {
        const us = new Coupon(tonConnectUI, isTestnet)
        if (!info?.address) return console.error('Error')

        const userConfirmed = window.confirm('Вы уверены, что хотите удалить чек?')

        if (!userConfirmed) {
            return
        }

        try {
            const res = await us.destroyMulti(info?.address)

            if (res === true) {
                handleCancelButtonClick()
                storageWallet.del(selectedCheckCard?.id)
                window.location.reload()
            }

            return res
        } catch (error) {
            console.error('Error fetching usage:', error)
        }
    }

    const telegramBG: CSSProperties = useBgTelegram(isTg)
    const telegramBG2: CSSProperties = useBg2Telegram(isTg)
    const telegramText: CSSProperties = useTextTelegram(isTg)

    const [ styleBtn, setStyleBtn ] = useState({})

    useEffect(() => {
        if (isTg) {
            setStyleBtn({
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
                important: 'true'
            })
        } else {
            setStyleBtn({})
        }
    }, [ isTg ])

    return (
        <div className={s.multicheckBody}>
            {isVisible && <div className={s.overlay}></div>}
            <div className={`${s.multicheck} ${isVisible ? s.slideIn : s.slideOut}`}>
                <div className={s.multicheckInner}>
                    <div className={`container ${s.container}`} style={telegramBG}>
                        <div className={s.headerTop}>
                            <h1 className={s.headerTitle} style={telegramText}>Multicheck</h1>
                            <Button
                                variant="small-button"
                                startIcon={CANCEL}
                                onClick={handleCancelButtonClick}
                                style={styleBtn}
                            />
                        </div>
                        <div className={`${s.multicheckInfo}`} style={telegramBG}>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Status:</div>
                                <div className={s.description} style={telegramText}>
                                    {Number(fixAmount(bal)) > 0.001 ? 'Not activated' : 'Activated'}
                                </div>
                            </div>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Address:</div>
                                <div className={s.descriptionAddress} onClick={handleCopyAddress} style={telegramText}>
                                    {smlAddr(info?.address)}
                                </div>
                            </div>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Sum:</div>
                                <div className={s.description} style={telegramText}>
                                    {fixAmount(Number(bal))} TON (
                                    <TokenPriceHook tokenAmount={Number(fixAmount(bal))} />)
                                </div>
                            </div>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Amount of one activation:</div>
                                <div className={s.description} style={telegramText}>
                                    {info?.amountActivation !== undefined
                                        ? fixAmount(Number(bal) / Number(info?.amountActivation))
                                        : 0 + ' '}
                                    TON (
                                    <TokenPriceHook
                                        tokenAmount={
                                            info?.amountActivation !== undefined
                                                ? Number(fixAmount(Number(bal) / Number(info?.amountActivation)))
                                                : 0
                                        }
                                    />
                                    )
                                </div>
                            </div>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Number of activations:</div>
                                <div className={s.description} style={telegramText}>{usage === 0 ? '0' : usage} out of {info?.amountActivation}</div>
                            </div>
                            <div className={s.item}>
                                <div className={s.title} style={telegramText}>Password:</div>
                                <div className={s.status}>
                                    <img src={DONE} alt="Done" />
                                </div>
                            </div>
                            <div className={s.itemAction}>
                                <div className={s.titleDownload} style={telegramText}>Download:</div>
                                <div>
                                    <button className={s.itemDownload} onClick={generateQRCodeAndDownload} style={styleBtn}>
                                        Download
                                        <img src={DOWNLOAD} alt="Download" />
                                    </button>
                                </div>
                            </div>
                            <div className={s.multicheckActions}>
                                <Button
                                    variant="action-button"
                                    startIcon={SHARE}
                                    onClick={handleShareAddress}
                                    style={styleBtn}
                                    isTg={isTg}
                                >
                                    Share
                                </Button>
                                <Button
                                    variant="action-button"
                                    startIcon={DELETE}
                                    onClick={handleRemove}
                                    style={styleBtn}
                                    isTg={isTg}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
