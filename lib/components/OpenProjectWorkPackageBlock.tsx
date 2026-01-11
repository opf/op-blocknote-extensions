import type { DefaultBlockSchema } from "@blocknote/core";
import { BlockNoteEditor, createBlockConfig, createBlockSpec } from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { createReactBlockSpec } from "@blocknote/react";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useWorkPackage } from "../hooks/useWorkPackage";
import { useWorkPackageSearch } from "../hooks/useWorkPackageSearch";
import type { WorkPackage } from "../openProjectTypes";
import { linkToWorkPackage } from "../services/openProjectApi";
import { useColors} from "../services/colors";
import { getAliases } from "../services/slashMenuAliases";
import { useTranslation } from "react-i18next"; // localize react components
import i18n from "../services/i18n.ts"; // localize other code

import { LinkIcon, SearchIcon } from "@primer/octicons-react";
import { SPACER_S, SPACER_M, SPACER_L, SPACER_XL } from "../services/css_constants";
import { WorkPackageElement } from "../elements/workPackageElement";
import { UnavailableWorkPackageElement } from "../elements/unavailableWorkPackageElement";
import styled from "styled-components";

const Block = styled.div.attrs({
  className: 'op-bn-extensions'
})`
    --highlight-wp-background: var(--bn-colors-highlights-gray-background);
    [data-color-scheme="dark"] & {
        --highlight-wp-background: var(--bn-colors-disabled-text);
    }
`;

const Search = styled.div.attrs({
  className: 'op-bn-search'
})`
  position: relative;
  padding: ${SPACER_M} ${SPACER_XL};
  box-shadow: var(--bn-shadow-medium);
  border-radius: var(--bn-border-radius-large);
  width: 100%;
  @media (min-width: 1120px) {
    width: 500px;
  }
`;

const SearchLabel = styled.label.attrs({
  className: 'op-bn-search--label'
})`
  font-weight: normal !important;
`;

const SearchInputWrapper = styled.div.attrs({
  className: 'op-bn-search--input-wrapper'
})`
  position: relative;
  margin-top: ${SPACER_M};
`;

const SearchIconWrapper = styled.div.attrs({
  className: 'op-bn-search--icon-wrapper'
})`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding-left: ${SPACER_M};
`;
const SearchInput = styled.input.attrs({
  className: 'op-bn-search--input'
})`
  width: 100%;
  padding: ${SPACER_M} ${SPACER_L};
  padding-left: 30px !important; // room for the search icon
  border: 1px solid #ccc;
  border-radius: var(--bn-border-radius-small);
`;

const Dropdown = styled.div.attrs({
  className: 'op-bn-dropdown'
})`
  background-color: var(--bn-colors-menu-background);
  overflow-y: auto;
  padding-top: ${SPACER_M};
  margin: 0 -${SPACER_M};
`;

const DropdownOption = styled.div.attrs({
  className: 'op-bn-dropdown--option'
})<{ selected: boolean }>`
  background-color: ${({ selected }) => selected ? 'var(--highlight-wp-background)' : 'var(--bn-colors-menu-background)'};
  border: none;
  border-radius: var(--bn-border-radius-small);
  margin: ${SPACER_S} 0;
  padding: 0 ${SPACER_M};
  cursor: pointer;
`;

const SearchWorkPackageElement = () => {
  const { t } = useTranslation();
  // TODO: Check if those refs are still needed when search is splitted off
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
  } = useWorkPackageSearch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath();

      if (
        dropdownRef.current &&
        !path.includes(dropdownRef.current) &&
        inputRef.current &&
        !path.includes(inputRef.current)
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
    // TODO: somehow create block with WP id at last cursor position
    //  setSelectedWorkPackage(workPackage);
    setSearchQuery("");
    setIsDropdownOpen(false);

    // Update block props to persist the selection
    // editor.updateBlock(block, {
    //   props: {
    //     ...block.props,
    //     wpid: workPackage.id,
    //   },
    // });
   //  setNewCursorPosition(editor, block);
  };

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
    <Search>
      <SearchLabel>
        {t("search.label")}
        <SearchInputWrapper>
          <SearchIconWrapper>
            <SearchIcon size={18} />
          </SearchIconWrapper>
          <SearchInput
            ref={inputRef}
            type="custom"
            placeholder={t("search.placeholder")}
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
        </SearchInputWrapper>
      </SearchLabel>

      {/* Autocomplete dropdown */}
      {isDropdownOpen && searchResults.length > 0 && (
        <Dropdown
          ref={dropdownRef}
          role="listbox"
          aria-label={t("search.dropdownAriaLabel")}
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
              <WorkPackageElement workPackage={wp} inDropdown="true" />
            </DropdownOption>
          ))}
        </Dropdown>
      )}
    </Search>
  )
}

interface BlockProps {
  id: string,
  props: {
    wpid: string;
  };
}

const OpenProjectWorkPackageBlockComponent = ({
  block,
  editor,
}: {
  block: BlockProps;
  editor: BlockNoteEditor<DefaultBlockSchema & { openProjectWorkPackage: ReturnType<typeof openprojectWorkPackageBlockConfig> }>;
}) => {
  const { t } = useTranslation();

  // Fetch and cache colors.
  // The hook handles triggering re-renders when data arrives.
  useColors();

  const [selectedWorkPackage, setSelectedWorkPackage] = useState<WorkPackage | null>(null);
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

  // Load saved work package if it exists
  const workPackageResult = useWorkPackage(block.props.wpid);

  // Set selected work package when loaded
  useEffect(() => {
    if (!workPackageResult.error && workPackageResult.workPackage) {
      setSelectedWorkPackage(workPackageResult.workPackage);
    }
  }, [workPackageResult.error, workPackageResult.workPackage]);

  // TODO: Should be removable
  // Autofocus search if no work package
  // useEffect(() => {
  //   if (workPackageResult.error || !workPackageResult.workPackage) {
  //     setTimeout(() => inputRef?.current?.focus(), 50);
  //   }
  // }, [workPackageResult.error, workPackageResult.workPackage]);

  // TODO: Can this be removed after the split?!
  const handleSelectWorkPackage = (workPackage: WorkPackage) => {
    setSelectedWorkPackage(workPackage);
    // setSearchQuery("");
    // setIsDropdownOpen(false);

    // Update block props to persist the selection
    editor.updateBlock(block, {
      props: {
        ...block.props,
        wpid: workPackage.id,
      },
    });
    setNewCursorPosition(editor, block);
  };

  return (
    <Block>
      <div>
        {block.props.wpid && !selectedWorkPackage && workPackageResult.loading && (
          <UnavailableWorkPackageElement header={t("unavailableWorkPackage.loading.header")} message={t("unavailableWorkPackage.loading.message")} />
        )}
        {block.props.wpid && !selectedWorkPackage && workPackageResult.unauthorized &&  (
          <UnavailableWorkPackageElement header={t("unavailableWorkPackage.unauthorized.header")} message={t("unavailableWorkPackage.unauthorized.message")} />
        )}
        {block.props.wpid && !selectedWorkPackage && workPackageResult.error && (
          <UnavailableWorkPackageElement header={t("unavailableWorkPackage.error.header")} message={t("unavailableWorkPackage.error.message")} />
        )}
        {selectedWorkPackage && (
          <WorkPackageElement workPackage={selectedWorkPackage} linkTitle={true} />
        )}
      </div>
    </Block>
  );
};

export const openprojectWorkPackageBlockConfig = createBlockConfig(
  () => ({
    type: "openProjectWorkPackage",
    propSchema: {
      wpid: { default: "" },
    },
    content: "none",
  }) as const
);

export const openProjectWorkPackageBlockSpec = createReactBlockSpec(
  openprojectWorkPackageBlockConfig,
  { render: (props) => <OpenProjectWorkPackageBlockComponent block={props.block} editor={props.editor as any} /> }
);

export const openProjectWorkPackageStaticBlockSpec = createBlockSpec(
  openprojectWorkPackageBlockConfig,
  {
    render: (block) => {
      const wpid = block.props.wpid;
      const href = linkToWorkPackage(wpid);

      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = `#${wpid}`;

      return {
        dom: anchor,
        contentDOM: anchor,
      };
    }
  }
);

export const openProjectWorkPackageSlashMenu = (editor: any) => ({
  title: i18n.t("slashMenu.title"),
  onItemClick: () => showWorkPackageDialog(editor), // insertOrUpdateBlockForSlashMenu(editor, { type: "openProjectWorkPackage" }),
  aliases: [...getAliases()],
  group: "OpenProject",
  icon: <LinkIcon size={18} />,
  subtext: i18n.t("slashMenu.subtext"),
})

function showWorkPackageDialog(editor: BlockNoteEditor<any>) {
  const container = document.createElement("div");
  container.className = "op-bn-search-dialog-container";
  editor.domElement.after(container);
  const root = createRoot(container);
  root.render(<SearchWorkPackageElement />);
}

// The link work package block is not editable, so the cursor should be
// positioned at the beginning of the next block.
// Selecting the work package from a dropdown with arrow keys and enter
// somehow messes the cursor position up, so we need to set it manually.
function setNewCursorPosition(editor: BlockNoteEditor<any>, block: BlockProps) {
  editor.focus();
  editor.setTextCursorPosition(block.id, "end");
  setCursorToNextBlock(editor, editor.getTextCursorPosition());
}

type TextCursorPosition = ReturnType<BlockNoteEditor<any>["getTextCursorPosition"]>;
function setCursorToNextBlock(editor: BlockNoteEditor<any>, cursorPosition: TextCursorPosition) {
  if (cursorPosition.nextBlock) {
    editor.setTextCursorPosition(cursorPosition.nextBlock.id, "start");
    return
  }
  // ensure it still works at the end of the document when there is no next block
  if (cursorPosition.block) {
    editor.setTextCursorPosition(cursorPosition.block.id, "end");
  }
}
