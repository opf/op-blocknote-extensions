import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import "./styles.css";

// Sets up Yjs document and PartyKit Yjs provider.
const doc = new Y.Doc();
const provider = new IndexeddbPersistence("blocknote-doc", doc);

provider.on("synced", () => {
  console.log(provider.get("blocknote-doc"));
});

export default function App() {
  const [markdown, setMarkdown] = useState<string>("");

  const editor = useCreateBlockNote({
    collaboration: {
      // The Yjs Provider responsible for transporting updates:
      provider,
      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),
      // Information (name and color) for this user:
      user: {
        name: "My Username",
        color: "#ff0000",
      },
    },
  });

  const onChange = async () => {
    // Converts the editor's contents from Block objects to Markdown and store to state.
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    setMarkdown(markdown);
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const convertMarkdownToBlocks = async () => {
    // Convert markdown to BlockNote blocks
    const blocks = await editor.tryParseMarkdownToBlocks(markdown);

    // Replace editor content with the new blocks
    editor.replaceBlocks(editor.document, blocks);
  };

  useEffect(() => {
    // on mount, trigger initial conversion of the initial content to md
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Renders the editor instance.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">BlockNote</div>
        <div className="view">
          <BlockNoteView editor={editor} onChange={onChange} />
        </div>
      </div>
      <div className="view-wrapper">
        <div className="view-label">Markdown</div>
        <div className="view">
          <textarea 
            value={markdown}
            onChange={handleMarkdownChange}
          />
          <button
            onClick={convertMarkdownToBlocks}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Convert markdown to Blocks
          </button>
        </div>
      </div>
    </div>
  );
}
