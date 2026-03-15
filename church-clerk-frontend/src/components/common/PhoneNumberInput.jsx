import { useEffect, useMemo, useRef, useState } from "react";

import PhoneInput, { getCountryCallingCode, isValidPhoneNumber } from "react-phone-number-input";
import Select, { components } from "react-select";
import "react-phone-number-input/style.css";

const AFRICAN_COUNTRIES = [
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CG",
  "CD",
  "CI",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RW",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "ZM",
  "ZW"
];

const DEFAULT_FLAG_URL = "https://purecatamphetamine.github.io/country-flag-icons/3x2/{XX}.svg";

const getFlagUrl = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return "";
  return DEFAULT_FLAG_URL.replace("{XX}", countryCode.toUpperCase());
};

function FlagIcon({ countryCode, size = 18 }) {
  const src = getFlagUrl(countryCode);
  if (!src) return null;

  return (
    <img
      alt={countryCode}
      src={src}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        objectFit: "cover",
        display: "block"
      }}
    />
  );
}

function CountryMenuList(props) {
  const { selectProps } = props;

  return (
    <components.MenuList {...props}>
      {selectProps?.menuSearchBar ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "white",
            padding: "8px",
            borderBottom: "1px solid rgba(0,0,0,0.08)"
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
        >
          <input
            ref={selectProps?.countryMenuSearchInputRef}
            value={selectProps?.countryMenuSearch || ""}
            onChange={(e) => {
              if (selectProps?.keepMenuOpenRef) selectProps.keepMenuOpenRef.current = true;
              selectProps?.onCountryMenuSearchChange?.(e.target.value);
            }}
            placeholder="Search country"
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
            onMouseDown={(e) => {
              if (selectProps?.keepMenuOpenRef) selectProps.keepMenuOpenRef.current = true;
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              if (selectProps?.keepMenuOpenRef) selectProps.keepMenuOpenRef.current = true;
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
      ) : null}

      {props.children}
    </components.MenuList>
  );
}

function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  flagOnlySelected = false,
  menuSearchBar = false
}) {
  const [menuSearch, setMenuSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const keepMenuOpenRef = useRef(false);

  const selectComponents = useMemo(() => {
    if (!menuSearchBar) return undefined;
    return { MenuList: CountryMenuList };
  }, [menuSearchBar]);

  const selectOptions = useMemo(() => {
    return (Array.isArray(options) ? options : [])
      .filter((o) => o && !o.divider)
      .map((o) => {
        const code = o.value || "ZZ";
        const isInternational = code === "ZZ";
        const callingCode = !isInternational ? `+${getCountryCallingCode(code)}` : "";
        const baseLabel = String(o.label || "International");
        const menuLabel = isInternational ? baseLabel : `${callingCode} ${baseLabel}`.trim();
        return { value: code, label: menuLabel, countryCode: isInternational ? "" : code };
      });
  }, [options]);

  useEffect(() => {
    if (!menuSearchBar) return;
    if (!menuOpen) return;
    const t = setTimeout(() => {
      keepMenuOpenRef.current = true;
      searchInputRef.current?.focus?.();
    }, 0);
    return () => clearTimeout(t);
  }, [menuOpen, menuSearchBar]);

  useEffect(() => {
    if (!menuSearchBar) return;
    if (!menuOpen) return;
    if (typeof document === "undefined") return;
    const el = searchInputRef.current;
    if (!el) return;

    if (document.activeElement !== el) {
      el.focus();
      try {
        const len = el.value?.length || 0;
        el.setSelectionRange(len, len);
      } catch {
        // ignore
      }
    }
  }, [menuSearch, menuOpen, menuSearchBar]);

  const filteredOptions = useMemo(() => {
    if (!menuSearchBar) return selectOptions;
    const q = menuSearch.trim().toLowerCase();
    if (!q) return selectOptions;

    return selectOptions.filter((o) => {
      const label = String(o?.label || "").toLowerCase();
      const code = String(o?.value || "").toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [menuSearch, menuSearchBar, selectOptions]);

  const selected = useMemo(() => {
    const v = value || "ZZ";
    return selectOptions.find((o) => o.value === v) || null;
  }, [selectOptions, value]);

  return (
    <div className={flagOnlySelected ? "w-[72px] min-w-[72px] max-w-[72px]" : "min-w-[160px]"}>
      <Select
        value={selected}
        onChange={(opt) => {
          const next = opt?.value || "ZZ";
          onChange(next === "ZZ" ? undefined : next);
        }}
        options={filteredOptions}
        isDisabled={disabled || readOnly}
        isSearchable={!menuSearchBar}
        menuIsOpen={menuSearchBar ? menuOpen : undefined}
        components={selectComponents}
        menuSearchBar={menuSearchBar}
        keepMenuOpenRef={keepMenuOpenRef}
        countryMenuSearchInputRef={searchInputRef}
        countryMenuSearch={menuSearch}
        onCountryMenuSearchChange={(value2) => setMenuSearch(value2)}
        onMenuOpen={() => {
          setMenuOpen(true);
        }}
        onMenuClose={() => {
          if (menuSearchBar && typeof document !== "undefined" && document.activeElement === searchInputRef.current) {
            setMenuOpen(true);
            return;
          }

          if (menuSearchBar && keepMenuOpenRef.current) {
            keepMenuOpenRef.current = false;
            setMenuOpen(true);
            return;
          }

          keepMenuOpenRef.current = false;
          setMenuOpen(false);
          setMenuSearch("");
        }}
        formatOptionLabel={(opt, meta) => {
          const isValue = meta?.context === "value";

          if (flagOnlySelected && isValue) {
            if (opt?.countryCode) {
              return (
                <div className="flex items-center justify-center">
                  <FlagIcon countryCode={opt.countryCode} size={18} />
                </div>
              );
            }

            return "🌐";
          }

          if (opt?.countryCode) {
            return (
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <FlagIcon countryCode={opt.countryCode} size={18} />
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0
                  }}
                >
                  {opt.label}
                </span>
              </div>
            );
          }

          return opt?.label || "";
        }}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, minWidth: 280 }),
          control: (base) => ({
            ...base,
            minHeight: 40,
            height: 40,
            minWidth: flagOnlySelected ? 72 : base.minWidth
          }),
          valueContainer: (base) => ({
            ...base,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: flagOnlySelected ? 6 : base.paddingLeft,
            paddingRight: flagOnlySelected ? 6 : base.paddingRight
          }),
          indicatorsContainer: (base) => ({ ...base, height: 40, paddingRight: flagOnlySelected ? 0 : base.paddingRight }),
          option: (base) => ({ ...base, fontSize: 13, whiteSpace: "nowrap" }),
          singleValue: (base) => ({ ...base, fontSize: 13 })
        }}
      />
    </div>
  );
}

export default function PhoneNumberInput({
  value,
  onChange,
  error,
  inputClassName = "",
  disabled = false,
  flagOnlySelectedCountry = false,
  countryMenuSearchBar = false
}) {
  const handleChange = (phone) => {
    if (!phone) {
      onChange("");
      return;
    }

    if (isValidPhoneNumber(phone)) {
      onChange(phone);
    } else {
      onChange(phone);
    }
  };

  const inputClass =
    inputClassName ||
    `h-10 w-full rounded-lg border ${error ? "border-red-300" : "border-gray-200"} bg-white px-3 text-sm text-gray-700`;

  return (
    <div>
      <PhoneInput
        defaultCountry="GH"
        international
        countries={AFRICAN_COUNTRIES}
        addInternationalOption={false}
        countryCallingCodeEditable={false}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        countrySelectComponent={(props) => (
          <CountrySelect
            {...props}
            flagOnlySelected={flagOnlySelectedCountry}
            menuSearchBar={countryMenuSearchBar}
          />
        )}
        numberInputProps={{
          className: inputClass
        }}
      />

      {error ? <p className="mt-1 text-[12px] text-red-600">Invalid phone number</p> : null}
    </div>
  );
}
