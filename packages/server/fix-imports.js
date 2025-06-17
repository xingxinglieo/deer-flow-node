import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 修复相对导入，添加 .js 扩展名
  let fixedContent = content;
  
  // 修复 from './...' 和 from '../...' 形式的导入
  fixedContent = fixedContent.replace(
    /from\s+['"]([\.]{1,2}\/[^'"]*?)['"];?/g,
    (match, importPath) => {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
        // 检查路径是否是目录，如果是则添加/index.js
        const fullImportPath = path.resolve(path.dirname(filePath), importPath);
        const jsPath = fullImportPath + '.js';
        const indexPath = path.join(fullImportPath, 'index.js');
        
        if (fs.existsSync(indexPath)) {
          return match.replace(importPath, importPath + '/index.js');
        } else if (fs.existsSync(jsPath)) {
          return match.replace(importPath, importPath + '.js');
        } else {
          // 默认添加.js扩展名
          return match.replace(importPath, importPath + '.js');
        }
      }
      return match;
    }
  );
  
  // 修复 import './...' 和 import '../...' 形式的导入
  fixedContent = fixedContent.replace(
    /import\s+['"]([\.]{1,2}\/[^'"]*?)['"];?/g,
    (match, importPath) => {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
        // 检查路径是否是目录，如果是则添加/index.js
        const fullImportPath = path.resolve(path.dirname(filePath), importPath);
        const jsPath = fullImportPath + '.js';
        const indexPath = path.join(fullImportPath, 'index.js');
        
        if (fs.existsSync(indexPath)) {
          return match.replace(importPath, importPath + '/index.js');
        } else if (fs.existsSync(jsPath)) {
          return match.replace(importPath, importPath + '.js');
        } else {
          // 默认添加.js扩展名
          return match.replace(importPath, importPath + '.js');
        }
      }
      return match;
    }
  );

  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixedCount = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (fixImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  console.log('Fixing imports in dist directory...');
  const fixedCount = processDirectory(distDir);
  console.log(`Import fixing completed! Fixed ${fixedCount} files.`);
} else {
  console.log('dist directory not found!');
} 