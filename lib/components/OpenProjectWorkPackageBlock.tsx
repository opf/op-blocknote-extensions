import { BlockNoteEditor, insertOrUpdateBlock, type BlockConfig, type InlineContentSchema, type StyleSchema } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import React, { useEffect, useRef, useState } from "react";
import { useWorkPackage } from "../hooks/useWorkPackage";
import { useWorkPackageSearch } from "../hooks/useWorkPackageSearch";
import type { WorkPackage } from "../openProjectTypes";
import { linkToWorkPackage } from "../services/openProjectApi";

import styled from "styled-components";

const UI_BLUE = "#000091"; // Default color for task status icons

const Block = styled.div`
  padding: 12px 10px;
  border: none;
  border-radius: 5px;
  background-color: #FBF5F2;
  width: 450px;
`;

const SearchContainer = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
`;

const DropdownOption = styled.div<{ selected: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  background-color: ${({ selected }) => selected ? '#f0f0f0' : 'transparent'};
  border-bottom: 1px solid #eee;
`;

const Type = styled.div`
  gap: 8px;
  font-weight: bold;
  text-transform: uppercase;
`;

const TypeColor = styled(Type) <{ color?: string }>`
  color: ${({ color }) => color || UI_BLUE};
`;

const Id = styled.div`
  color: #666;
`;

const Status = styled.div<{ bgcolor?: string }>`
  font-size: 0.8rem;
  border-radius: 12px;
  padding: 2px 8px;
  border: 1px solid #ccc;
  background-color: ${({ bgcolor }) => bgcolor || UI_BLUE};
`;

const Link = styled.a`
  margin-right: 6px;
  text-decoration: none;
  color: #000091;
  cursor: pointer;
`;

interface BlockProps {
  props: {
    wpid: string;
    subject: string;
    status: string;
    assignee: string;
    type: string;
    href: string;
  };
}

const OpenProjectWorkPackageBlockComponent = ({
  block,
  editor,
}: {
  block: BlockProps;
  editor: any;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search mode state (API + debounce only)
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
  } = useWorkPackageSearch();

  const [selectedWorkPackage, setSelectedWorkPackage] = useState<WorkPackage | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

  // Load saved work package if it exists
  const workPackageResult = useWorkPackage(block.props.wpid);

  // Set selected work package when loaded
  useEffect(() => {
    if (!workPackageResult.error && workPackageResult.workPackage) {
      setSelectedWorkPackage(workPackageResult.workPackage);
    }
  }, [workPackageResult.error, workPackageResult.workPackage]);

  // Autofocus search if no work package
  useEffect(() => {
    if (workPackageResult.error || !workPackageResult.workPackage) {
      setTimeout(() => inputRef?.current?.focus(), 50);
    }
  }, [workPackageResult.error, workPackageResult.workPackage]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectWorkPackage = (workPackage: WorkPackage) => {
    setSelectedWorkPackage(workPackage);
    setSearchQuery("");
    setIsDropdownOpen(false);

    // Update block props to persist the selection
    editor.updateBlock(block, {
      props: {
        ...block.props,
        wpid: workPackage.id,
        subject: workPackage.subject,
        status: workPackage._links?.status?.title || "",
        assignee: workPackage._links?.assignee?.title || "",
        type: workPackage._links?.type?.title || "",
        href: workPackage._links?.self?.href || "",
      },
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedResultIndex >= 0 && focusedResultIndex < searchResults.length) {
          handleSelectWorkPackage(searchResults[focusedResultIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <Block>
      <div>
        {!block.props.wpid && (
          <SearchContainer>
            <SearchInput
              ref={inputRef}
              type="text"
              placeholder={"Search for work package ID or subject"}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) {
                  setIsDropdownOpen(true);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
            />

            {/* Autocomplete dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <Dropdown
                ref={dropdownRef}
                role="listbox"
                aria-label={"Work package search results"}
              >
                {searchResults.slice(0, 5).map((wp, index) => (
                  <DropdownOption
                    key={wp.id}
                    role="option"
                    aria-selected={focusedResultIndex === index}
                    tabIndex={0}
                    selected={focusedResultIndex === index}
                    onClick={() => handleSelectWorkPackage(wp)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectWorkPackage(wp);
                      }
                    }}
                    onMouseEnter={() => setFocusedResultIndex(index)}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      #{wp.id} - {wp.subject}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {wp._links?.type?.title} {wp._links?.status?.title}
                    </div>
                  </DropdownOption>
                ))}
              </Dropdown>
            )}
          </SearchContainer>
        )}
        {block.props.wpid && !selectedWorkPackage && (
          <div>
            #{block.props.wpid} {block.props.subject}
          </div>
        )}
        {/* Display selected work package details */}
        {selectedWorkPackage && (
          <div>
            <div style={{ display: "flex", gap: "8px" }}>
              <TypeColor color={selectedWorkPackage._embedded?.type?.color}>
                {selectedWorkPackage._links?.type?.title}
              </TypeColor>
              <Id>#{selectedWorkPackage.id}</Id>
              <Status bgcolor={selectedWorkPackage._embedded?.status?.color}>
                {selectedWorkPackage._links?.status?.title}
              </Status>
            </div>

            <div>
              <Link
                href={linkToWorkPackage(block.props.wpid)}
              >
                {selectedWorkPackage.subject}
              </Link>
            </div>
          </div>
        )}
      </div>
    </Block>
  );
};

export default OpenProjectWorkPackageBlockComponent;

export const openProjectWorkPackageBlockSpec = createReactBlockSpec(
  {
    type: "openProjectWorkPackage",
    propSchema: {
      wpid: { default: "", type: "string" },
      subject: { default: "", type: "string" },
      status: { default: "", type: "string" },
      assignee: { default: "", type: "string" },
      type: { default: "", type: "string" },
      href: { default: "", type: "string" },
    },
    content: "inline",
  },
  {
    render: (props) => {
      return <OpenProjectWorkPackageBlockComponent block={props.block} editor={props.editor} />;
    },
  }
);

export const openProjectWorkPackageSlashMenu = (editor: BlockNoteEditor<Record<string, BlockConfig>, InlineContentSchema, StyleSchema>) => ({
  title: "Open Project Work Package",
  onItemClick: () =>
    insertOrUpdateBlock(editor, {
      type: "openProjectWorkPackage",
    }),
  aliases: ["openproject", "workpackage", "op", "wp"],
  group: "OpenProject",
  icon: <span>📦</span>,
  subtext: "Search and link an existing Work Package",
})
