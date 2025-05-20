import SmallLogo from "~/assets/logo_64x.png";
import { MenuItem, MenuSection } from "../menuitem";
import { Menu, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from "react";
import NotificationBox from "../notification-box";
import { useStore } from "~/stores";

import { useRevalidator, useLocation, Link, Outlet } from "react-router";
import { css } from 'carbonyxation/css'
import { hstack, flex } from "carbonyxation/patterns";

const BubbleChat = lazy(() => import("flowise-embed-react").then((module) => ({
  default: module.BubbleChat
})))

export default function Shell() {
  // Calculate the header height (assuming padding: "4" is 16px on each side, total 32px + assumed content height of 24px)
  const headerHeight = "65px"; // **Adjust this value to your actual header height**
  const [displayMenu, setDisplayMenu] = useState(false)
  const auth = useAuth()
  const [currentOrgId, setCurrentOrgId] = useState("")
  const { revalidate } = useRevalidator()
  const [renderBubble, setRenderBubble] = useState(true)
  const location = useLocation()
  const [isBrowser, setIsBrowser] = useState(false)

  const subscriptionPlan = useStore((state) => state.subscriptionPlan)

  useEffect(() => {
    setIsBrowser(true)
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/notebook')) {
      setRenderBubble(false)
    } else {
      setRenderBubble(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn) return

    if (auth.orgId !== currentOrgId && auth.orgId) {
      setCurrentOrgId(auth.orgId)
      revalidate()

    }
  }, [auth.orgId, auth.isLoaded, auth.isSignedIn])

  return (
    <div
      className={css({
        height: "100vh", // Use vh directly for clarity
      })}
    >
      <div
        className={hstack({
          padding: "4",
          width: "full",
          bg: "white",
          borderBottom: "1px solid",
          justifyContent: "space-between",

        })}
      >
        <Link to="/dashboard">
          <span
            className={flex({
              fontSize: "xl",
              fontWeight: "bold",
              alignItems: "center",
              gap: 2,
            })}
          >
            {!displayMenu ? (
              <Menu className={css({
                display: "unset",
                sm: {
                  display: "none"
                }
              })} onClick={() => setDisplayMenu(!displayMenu)} />
            ) : (
              <X className={css({
                display: "unset",
                sm: {
                  display: "none"
                }
              })} onClick={() => setDisplayMenu(!displayMenu)} />

            )}
            <img src={SmallLogo} alt="Carbonyx" width={32} />
            Carbonyx
            <OrganizationSwitcher hidePersonal={true} />
          </span>
        </Link>
        <UserButton />
      </div>
      <div
        className={flex({
          w: "full",
          // Calculate the remaining height after subtracting the header
          height: `calc(100vh - ${headerHeight})`,

        })}
      >
        <div
          className={css({
            display: `${displayMenu ? "flex" : "none"}`,
            maxWidth: "18rem",
            sm: {
              display: "flex",
              minW: "56",
              width: "unset"
            },
            flexDirection: "column",
            height: "full",
            bg: "white",
            borderRight: "1px solid",
            justifyContent: "space-between",
            overflowY: "auto",
          })}
        >
          <div>
            <MenuSection>
              <MenuItem text="Dashboard" icon="home" route="/dashboard" exact />
              <MenuItem text="Pluem AI" icon="comment" route="/dashboard/notebook" />

              <div className={css({
                p: 2,
                pt: 4,
                borderBottomWidth: 1,
                borderBottom: 'solid',
                borderBottomColor: 'neutral.400'

              })}>
                <span className={css({
                  fontWeight: 'semibold',
                  color: 'neutral.600'
                })}>Inventory</span>
              </div>

              <MenuItem text="Navigation" icon="location" route="/dashboard/navigation" />
              <MenuItem text="Assets" icon="assets" route="/dashboard/assets" />
              <MenuItem
                text="Manual Emissions"
                icon="emissions"
              >
                <MenuItem text="Electricity" route="/dashboard/electricity" />
                <MenuItem
                  text="Stationary Fuels"
                  route="/dashboard/stationary_fuels"
                />
                <MenuItem
                  text="Transportation"
                  route="/dashboard/transportation"
                />
                <MenuItem text="Waste" route="/dashboard/waste" />
              </MenuItem>
              <MenuItem text="Integration" icon="integration">
                <MenuItem text="Excel" route="/dashboard/coming-soon-excel" />
                <MenuItem text="ERP" route="/dashboard/coming-soon-erp" />
              </MenuItem>
              <MenuItem text="Custom Factor" icon="custom_factor" route="/dashboard/factor" />
            </MenuSection>
          </div>
          <div>
            {subscriptionPlan === 'Demo' &&
              <NotificationBox title='You are on a Demo Plan!' content='This is a demo plan, organization data may be deleted after a month. Select a plan to make it permanent!' buttonText="Choose Plan" color='primary' actionLink="/pricing" />
            }

            <hr
              className={css({
                borderTop: "1px solid",
                borderTopColor: "neutral.400",
              })}
            />
            <MenuItem text="0% of footprint" icon="circle" />
            <MenuItem text="Help center" icon="question" />
            <MenuItem text="Settings" icon="gear" route="/dashboard/settings" />
          </div>
        </div>
        <div
          className={css({
            flex: 1,
            overflowY: "auto", // Use overflowY for better control
          })}
        >
          <Outlet />
        </div>
        {renderBubble && isBrowser &&
          <Suspense fallback={<div></div>}>
            <BubbleChat
              chatflowid="carbonyx"
              apiHost="/api/flowise"
              theme={{
                button: {
                  backgroundColor: '#496a57',
                  right: 20,
                  bottom: 20,
                  size: 48,
                  dragAndDrop: true,
                  iconColor: 'white',
                },
                chatWindow: {
                  showTitle: true,
                  showAgentMessages: true,
                  title: "ถามปลื้ม",
                  titleTextColor: "#ffffff",
                  welcomeMessage: "สวัสดีครับ ผมชื่อปลื้ม ถามคำถามเกี่ยวกับคาร์บอนกับผมได้เลยนะ",
                  height: 900,
                  fontSize: 14,
                  width: 500,
                  textInput: {
                    placeholder: 'สงสัยอะไรหรอ',
                    backgroundColor: '#ffffff',
                    textColor: '#303235',
                    sendButtonColor: '#3B81F6',
                    autoFocus: true,
                  },
                  botMessage: {
                    backgroundColor: '#f7f5ef',
                    textColor: '#303235',
                    showAvatar: true,
                    avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                  },
                  starterPrompts: ['วิเคราะห์การปลดปล่อยคาร์บอนภายในองค์กรให้หน่อย', 'มีส่วนไหนที่ปล่อยคาร์บอนเยอะเกินไปไหม ลดยังไงได้บ้าง', 'ตอนนี้เทรนด์คาร์บอนมีอะไรเกิดขึ้นบ้าง'],
                  userMessage: {
                    backgroundColor: '#496a57',
                    textColor: '#ffffff',
                    showAvatar: true,
                    avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                  },

                  footer: {
                    textColor: '#303235',
                    text: 'Made with ❤️ by',
                    company: 'Carbonyx',
                    companyLink: 'https://carbonyx.chanakancloud.net/'
                  }
                },
              }}
            />
          </Suspense>
        }
      </div>
    </div>
  );
}
