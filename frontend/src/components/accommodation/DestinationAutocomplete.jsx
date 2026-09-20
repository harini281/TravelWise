import { useEffect, useId, useRef, useState } from "react";
import { autocompleteDestinations } from "../../utils/accommodationService";

export default function DestinationAutocomplete({ value, onChange }) {
  const id = useId();
  const [query, setQuery] = useState(value?.displayName || "");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const pending = useRef(null);

  useEffect(() => {
    if (value || query.trim().length < 2) return;
    const controller = new AbortController();
    pending.current = controller;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await autocompleteDestinations(query, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(data.destinations || []);
          setSearched(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof TypeError
          ? "Destination search could not connect. Check your connection and try again." : err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value]);

  function select(place) {
    pending.current?.abort();
    setQuery(place.displayName);
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
    setError("");
    onChange(place);
  }

  return (
    <div className="tw-stay-destination" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={`${id}-input`}>Destination</label>
      <input id={`${id}-input`} role="combobox" aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0} aria-controls={`${id}-list`}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-help`} autoComplete="off" maxLength={100}
        placeholder="Search a city or destination" value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          pending.current?.abort();
          setQuery(event.target.value); onChange(null);
          setSuggestions([]); setError(""); setSearched(false); setLoading(false); setOpen(true); setActive(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            setActive((index) => suggestions.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length : -1);
          }
          if (event.key === "Enter" && open && active >= 0 && suggestions[active]) {
            event.preventDefault(); select(suggestions[active]);
          }
        }} />
      <small id={`${id}-help`}>Choose the exact place from the suggestions.</small>
      {open && suggestions.length > 0 && <ul id={`${id}-list`} role="listbox" className="tw-stay-suggestions">
        {suggestions.map((place, index) => <li key={place.providerId} id={`${id}-option-${index}`}
          role="option" aria-selected={index === active} onMouseDown={(event) => event.preventDefault()}
          onClick={() => select(place)}>
          {place.displayName}
        </li>)}
      </ul>}
      <div className="tw-stay-search-status" role="status">
        {loading ? "Finding destinations…" : error || (searched && !suggestions.length && !value ? "No matching destinations. Try another name." : "")}
      </div>
    </div>
  );
}
