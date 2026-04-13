import React, { useState } from 'react';
import { BOMGraph } from './components/BOMGraph';
import { mockBOM } from './data/mockBom';
import { LayoutDashboard, Settings2, Eye, EyeOff, Users, Layers, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ReactFlowProvider } from '@xyflow/react';

export default function App() {
  const [showVirtual, setShowVirtual] = useState(false);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
        {/* Main Content */}
        <main className="flex-1 flex flex-col relative">
          {/* Graph Area */}
          <div className="flex-1 p-0">
            <BOMGraph 
              items={mockBOM} 
              showVirtual={showVirtual} 
              setShowVirtual={setShowVirtual}
              groupBy="none"
            />
          </div>
        </main>
      </div>
    </ReactFlowProvider>
  );
}
