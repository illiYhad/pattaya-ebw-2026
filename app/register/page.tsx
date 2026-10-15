import type { Metadata } from "next";
import { ARTWORK_DIR, REGISTER } from "@/lib/artwork";
import { PosterText } from "@/components/site/PosterText";
import { CopyButton } from "@/components/site/CopyButton";
import { Actions, Btn, Card, PosterPage, SectionH2, cx, s } from "@/components/site/PosterPage";

export const revalidate = 20;
export const metadata: Metadata = { title: "สมัครแข่งขัน", description: "รายละเอียดการสมัครแข่งขัน ค่าสมัคร สิ่งที่ได้รับ และช่องทางการโอนเงิน" };

/** หน้า /register — จากโปสเตอร์รายละเอียดการสมัคร + ช่องทางโอนเงิน */
export default function RegisterPage() {
  const { bank } = REGISTER;
  const accountDigits = bank.account.replace(/\D/g, "");
  const phoneDigits = bank.phone.replace(/\D/g, "");
  return (
    <PosterPage plate={REGISTER.plate}>
      <div className={s("pp-fees")}>
        <Card>
          <ul className={s("pp-bul")}>
            {REGISTER.details.map((x, i) => (
              <li key={i}><PosterText text={x} /></li>
            ))}
          </ul>
        </Card>
        <div className={s("pp-prices")}>
          {REGISTER.prices.map((p) => {
            const deal = "deal" in p && p.deal;
            const pre = "pre" in p ? p.pre : undefined;
            return (
              <div key={p.label} className={cx("pp-price", deal && "is-deal")}>
                <span className={s("lb")}><PosterText text={p.label} /></span>
                {pre && <span className={s("pre")}>{pre}</span>}
                <span className={s("am")}>{p.amount}</span>
                <span className={s("cu")}>{p.unit}</span>
              </div>
            );
          })}
        </div>
      </div>

      <SectionH2 text={REGISTER.benefitsTitle} />
      <Card>
        <ul className={s("pp-ben")}>
          {REGISTER.benefits.map((b) => (
            <li key={b.ico}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ARTWORK_DIR}${b.ico}`} width={120} height={120} alt="" />
              <span><PosterText text={b.text} /></span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionH2 text={REGISTER.bankTitle} />
      <div className={s("pp-bank")}>
        <div className={s("pp-bank-hd")}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="23" fill="#F6EAE2" stroke="#D9B39C" strokeWidth="2" />
            <path d="M11 19.5L24 12l13 7.5v2H11z" fill="#1F5866" />
            <g fill="#1F5866">
              <rect x="13.5" y="23" width="3.2" height="10" rx=".6" />
              <rect x="20" y="23" width="3.2" height="10" rx=".6" />
              <rect x="24.8" y="23" width="3.2" height="10" rx=".6" />
              <rect x="31.3" y="23" width="3.2" height="10" rx=".6" />
              <rect x="11" y="34.5" width="26" height="3" rx=".8" />
            </g>
          </svg>
          <div>
            <b>{bank.name}</b>
            <small>{bank.name_en}</small>
          </div>
        </div>
        <dl>
          <dt>เลขที่บัญชี</dt>
          <dd>
            <span className={s("acc")}>{bank.account}</span>
            <CopyButton value={accountDigits} className={s("pp-copy")} />
          </dd>
          <dt>ชื่อบัญชี</dt>
          <dd><PosterText text={bank.holder} /></dd>
          <dt>เบอร์โทร</dt>
          <dd><a href={`tel:${phoneDigits}`}>{bank.phone}</a></dd>
        </dl>
        <p className={s("pp-bank-ft")}><PosterText text={bank.footer} /></p>
      </div>

      <Actions>
        <Btn href="/categories">ดูประเภทและกติกา</Btn>
        <Btn href="/info" ghost>ข้อมูลงาน · Dress code</Btn>
      </Actions>
    </PosterPage>
  );
}
