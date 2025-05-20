import { css } from "carbonyxation/css";
import { flex, grid, vstack, hstack } from "carbonyxation/patterns";
import { button } from "~/components/button";
import Bg from "~/assets/authbg.jpg";
import SmallLogo from "~/assets/logo_64x.png";

export default function SignInPage() {
  return (
    <div
      className={flex({
        flexDir: "column",
        md: {
          flexDir: "row",
          justifyContent: "space-between"
        },
        height: "svh",
      })}
    >
      <div
        className={css({
          height: "12rem",
          md: {
            height: "full",
            maxHeight: "svh",
            width: "1/2",
          },
          padding: 2,
        })}
      >
        <img
          src={Bg}
          className={css({
            objectFit: "cover",
            objectPosition: "center",
            height: "12rem",
            md: {
              height: "full",
            },
            width: "full",
            rounded: "2xl",
          })}
        />
      </div>

      <div
        className={vstack({
          alignItems: "center",
          justifyContent: "space-between",
          paddingY: 16,
          gap: 12,
          md: {
            width: "1/2"
          }
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
          className={vstack({
            alignItems: "center",
            justifyContent: "center",
            height: "full",
            lineHeight: 1,
            width: "24rem",
          })}
        >
          <span>Sign in</span>
        </div>
      </div>
    </div>
  );
}
