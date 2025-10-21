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


  // Send an update for the document to the server (as markdown) 
  const updateDocument = async (markdown: string) => {
    const response = await fetch("http://localhost:3001/api/markdown-to-yDoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markdown }),
    });
  };

  // Retrieve the document from the server (as blocks)
  const retrieveDocument = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/document", {
        method: "GET",
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the editor with the retrieved blocks
        editor.replaceBlocks(editor.document, data.blocks);
        
      } else {
        console.error('Failed to retrieve document:', response.statusText);
      }
    } catch (error) {
      console.error('Error retrieving document:', error);
    }
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const handleSendMarkdownUpdate = async () => {
    await updateDocument(markdown);
  };
  useEffect(() => {
      // on mount, trigger initial conversion of the initial content to md
      retrieveDocument();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  // Renders the editor instance.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">BlockNote</div>
        <div className="view">
          <BlockNoteView editor={editor}/>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={retrieveDocument}
            style={{
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retrieve document
          </button>
        </div>
      </div>

      <div className="view-wrapper">
        <div className="view-label">Markdown</div>
        <div className="view">
          <textarea 
            value={markdown}
            onChange={handleMarkdownChange}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={handleSendMarkdownUpdate}
            style={{
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Send markdown update
          </button>
        </div>
      </div>
    </div>
  );
}