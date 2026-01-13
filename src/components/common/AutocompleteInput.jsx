import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export default function AutocompleteInput({ 
  value, 
  onChange, 
  onBlur,
  suggestions = [], 
  placeholder,
  disabled,
  required,
  className
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value || value.length < 1) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = suggestions
      .filter(s => s && s.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 5);
    
    setFilteredSuggestions(filtered);
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange(e);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ target: { value: suggestion } });
    setShowSuggestions(false);
  };

  const handleInputBlur = (e) => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (onBlur) onBlur(e);
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm text-gray-700 hover:text-green-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}