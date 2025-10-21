import express from 'express';
import cors from 'cors';
import { ServerBlockNoteEditor } from '@blocknote/server-util';
import * as Y from 'yjs';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ydoc = new Y.Doc();
const docName = "document-store";

// Create server editor instance for storing document state
const serverEditor = ServerBlockNoteEditor.create({
    collaboration: {
      // Where to store BlockNote data in the Y.Doc:
      fragment: ydoc.getXmlFragment(docName),
    }
  });

// Endpoint to get the current document as BlockNote JSON
app.get('/api/document', async (req, res) => {
  try {

    const blocks = serverEditor.yDocToBlocks(ydoc, docName);

    res.json({ blocks });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to accept markdown, convert to Y.Doc and store it
app.post('/api/markdown-to-yDoc', async (req, res) => {
  try {
    const { markdown } = req.body;
    
    console.log("--------------------------------");
    console.log("markdown: \n" + markdown);
    // Convert markdown to blocks
    const blocks = await serverEditor.tryParseMarkdownToBlocks(markdown);
    const newYdoc = serverEditor.blocksToYDoc(blocks, docName);

    const encodedAsUpdate = Y.encodeStateAsUpdate(newYdoc);
    
    // Apply the update to the global ydoc
    Y.applyUpdate(ydoc, encodedAsUpdate);

    console.log("after applyUpdate: \n" + await serverEditor.blocksToMarkdownLossy(serverEditor.yDocToBlocks(ydoc, docName)));
    console.log(ydoc.getXmlFragment(docName));

    res.json({ success: true });
  } catch (error) {
    console.error('Error converting markdown to yDoc:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

