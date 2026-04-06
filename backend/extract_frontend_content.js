require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

const FRONTEND_SRC = path.join(__dirname, '..', 'frontend', 'src', 'Pages');
const OUTPUT_DIR = path.join(__dirname, 'data', 'website_content');

/**
 * Extract meaningful content from React component
 */
function extractContentFromJSX(fileContent, fileName) {
    let content = [];
    
    // Extract text content from JSX
    // Look for strings in JSX tags, excluding imports and exports
    const jsxContent = fileContent
        .split('\n')
        .filter(line => !line.trim().startsWith('import '))
        .filter(line => !line.trim().startsWith('export '))
        .join('\n');
    
    // Extract strings from JSX (text between > and <)
    const textMatches = jsxContent.match(/>[^<>]{3,}</g);
    if (textMatches) {
        textMatches.forEach(match => {
            const text = match.substring(1).trim();
            // Filter out common non-content strings
            if (text && 
                !text.startsWith('{') && 
                !text.startsWith('//') &&
                !text.includes('className') &&
                !text.includes('onClick') &&
                text.length > 2) {
                content.push(text);
            }
        });
    }
    
    // Extract string literals (in quotes)
    const stringMatches = jsxContent.match(/["']([^"']{10,})["']/g);
    if (stringMatches) {
        stringMatches.forEach(match => {
            const text = match.slice(1, -1).trim();
            // Skip if it's a CSS class, path, or URL
            if (text && 
                !text.includes('css') &&
                !text.includes('.jsx') &&
                !text.includes('http') &&
                !text.includes('@') &&
                !text.match(/^[a-z-]+$/) && // Skip single class names
                text.length > 10) {
                content.push(text);
            }
        });
    }
    
    return content;
}

/**
 * Special handler for About.jsx to extract team information
 */
function extractAboutPageContent(fileContent) {
    const content = [];
    
    content.push('===========================================');
    content.push('CAMPUSCREW TEAM INFORMATION');
    content.push('===========================================');
    content.push('');
    content.push('About CampusCrew:');
    content.push('Who are we? We are a passionate team dedicated to delivering the best products and services. Our mission is to drive innovation and quality in every aspect of our work.');
    content.push('');
    content.push('===========================================');
    content.push('OUR TEAM MEMBERS:');
    content.push('===========================================');
    content.push('');
    
    // Extract team member information
    const teamMembers = [
        {
            name: 'Asif A Khuda',
            email: 'asif13.aak@gmail.com',
            role: 'Developer'
        },
        {
            name: 'Sanjida Amin',
            email: 'sanjidasunny25@gmail.com',
            role: 'Developer'
        },
        {
            name: 'Tajuddin Ahmed',
            email: 'bijoy.ahmed12555@gmail.com',
            role: 'Developer'
        }
    ];
    
    content.push('The CampusCrew team consists of three dedicated developers:');
    content.push('');
    
    teamMembers.forEach((member, index) => {
        content.push(`${index + 1}. ${member.name}`);
        content.push(`   Email: ${member.email}`);
        content.push(`   Role: ${member.role}`);
        content.push('');
    });
    
    content.push('Team Information Summary:');
    content.push(`- Team Members: ${teamMembers.map(m => m.name).join(', ')}`);
    content.push('- Total Members: 3');
    content.push('- Team Emails: ' + teamMembers.map(m => m.email).join(', '));
    content.push('');
    content.push('If you need to contact our team, you can reach out to any of the members listed above.');
    
    return content.join('\n');
}

/**
 * Create readable content files from React components
 */
async function extractFrontendContent() {
    console.log('📂 Extracting content from frontend components...\n');
    
    try {
        // Read all JSX files from Pages directory
        const files = await fs.readdir(FRONTEND_SRC);
        const jsxFiles = files.filter(f => f.endsWith('.jsx'));
        
        console.log(`Found ${jsxFiles.length} React components\n`);
        
        let processedCount = 0;
        
        for (const file of jsxFiles) {
            const filePath = path.join(FRONTEND_SRC, file);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const baseName = file.replace('.jsx', '').toLowerCase();
            
            let textContent = '';
            
            // Special handling for specific pages
            if (file === 'About.jsx') {
                textContent = extractAboutPageContent(fileContent);
            } else {
                // Generic extraction
                const extracted = extractContentFromJSX(fileContent, file);
                if (extracted.length > 0) {
                    textContent = `${baseName.charAt(0).toUpperCase() + baseName.slice(1)} Page\n\n`;
                    textContent += extracted.join('\n\n');
                }
            }
            
            // Only create file if we extracted meaningful content
            if (textContent && textContent.length > 50) {
                const outputFile = path.join(OUTPUT_DIR, `${baseName}_frontend.txt`);
                await fs.writeFile(outputFile, textContent, 'utf-8');
                console.log(`✅ Created: ${baseName}_frontend.txt (${textContent.length} chars)`);
                processedCount++;
            } else {
                console.log(`⏭️  Skipped: ${file} (no significant content)`);
            }
        }
        
        console.log(`\n✅ Processed ${processedCount} components`);
        console.log('\n📋 Next steps:');
        console.log('   1. Review the generated *_frontend.txt files');
        console.log('   2. Edit them to add any missing information');
        console.log('   3. Restart the server to auto-update the database:');
        console.log('      node index.js');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run the extraction
extractFrontendContent();
