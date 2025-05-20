import { css } from "carbonyxation/css";
import { container, flex, hstack } from "carbonyxation/patterns";
import { button } from "./button";
import SmallLogo from "../assets/logo_64x.png";
import { Link } from "react-router";

interface Props {
  user: any
  signUpUrl: string
}

export default function LandingBar({ user, signUpUrl }: Props) {
  return (
    <nav
      className={css({
        padding: "4",
        position: "fixed",
        width: "full",
      })}
    >
      <div
        className={hstack({
          gap: "4",
          justify: "space-between",
        })}
      >
        <span
          className={flex({
            fontSize: "xl",
            fontWeight: "bold",
            alignItems: "center",
            gap: 2,
          })}
        >
          <img src={SmallLogo} alt="Carbonyx" width={32} />
          Carbonyx
        </span>
        <div
          className={hstack({
            gap: 2,
          })}
        >
          <Link to='/pricing'>
            <button
              className={button({
                color: "secondary",
                variant: "outline",
              })}
            >
              Pricing
            </button>
          </Link>
          <button
            className={button({
              color: "secondary",
              variant: "outline",
            })}
          >
            Contact Us
          </button>
          {!user ? (
            <Link to={signUpUrl}>
              <button
                className={button({
                  color: "primary",
                })}
              >
                Sign Up
              </button>
            </Link>
          ) : (
            <Link to='/dashboard'>
              <button className={button({
                color: "primary"
              })}>
                Dashboard
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
