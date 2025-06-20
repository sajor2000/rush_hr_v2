#!/usr/bin/env python3
"""
Auto-detection and configuration script for Medical Ontology MCP
Detects available editors and generates appropriate MCP configurations
"""

import os
import sys
import json
import platform
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import subprocess

class MCPConfigurator:
    """Auto-configure MCP for detected editors and environments"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.system = platform.system().lower()
        self.detected_editors = []
        self.configurations = {}
        
    def detect_editors(self) -> List[str]:
        """Detect installed editors and IDEs"""
        editors = []
        
        # Claude Desktop detection
        if self.detect_claude_desktop():
            editors.append("claude_desktop")
            
        # VS Code detection
        if self.detect_vscode():
            editors.append("vscode")
            
        # Cursor detection  
        if self.detect_cursor():
            editors.append("cursor")
            
        # Windsurf detection
        if self.detect_windsurf():
            editors.append("windsurf")
            
        # Claude Code detection (current environment)
        if self.detect_claude_code():
            editors.append("claude_code")
            
        self.detected_editors = editors
        return editors
    
    def detect_claude_desktop(self) -> bool:
        """Detect Claude Desktop installation"""
        if self.system == "darwin":  # macOS
            claude_app = Path("/Applications/Claude.app")
            return claude_app.exists()
        elif self.system == "windows":
            # Check common Windows installation paths
            paths = [
                Path(os.environ.get("LOCALAPPDATA", "")) / "Claude",
                Path(os.environ.get("PROGRAMFILES", "")) / "Claude",
                Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Claude"
            ]
            return any(path.exists() for path in paths)
        elif self.system == "linux":
            # Check for Claude in common Linux locations
            return shutil.which("claude") is not None
        return False
    
    def detect_vscode(self) -> bool:
        """Detect VS Code installation"""
        return shutil.which("code") is not None
    
    def detect_cursor(self) -> bool:
        """Detect Cursor IDE installation"""
        return shutil.which("cursor") is not None
    
    def detect_windsurf(self) -> bool:
        """Detect Windsurf IDE installation"""
        if self.system == "darwin":
            windsurf_app = Path("/Applications/Windsurf.app")
            return windsurf_app.exists()
        return shutil.which("windsurf") is not None
    
    def detect_claude_code(self) -> bool:
        """Detect if running in Claude Code environment"""
        # Check for Claude Code specific environment variables
        claude_code_indicators = [
            "CLAUDE_CODE_SESSION",
            "ANTHROPIC_CLI_SESSION",
            "_CLAUDE_CODE"
        ]
        return any(os.environ.get(var) for var in claude_code_indicators)
    
    def get_editor_config_path(self, editor: str) -> Optional[Path]:
        """Get the configuration file path for each editor"""
        paths = {
            "claude_desktop": self.get_claude_desktop_config_path(),
            "claude_code": self.project_root / ".mcp.json",
            "vscode": self.project_root / ".vscode" / "mcp.json", 
            "cursor": self.project_root / ".cursor" / "mcp.json",
            "windsurf": None  # Windsurf uses manual configuration
        }
        return paths.get(editor)
    
    def get_claude_desktop_config_path(self) -> Optional[Path]:
        """Get Claude Desktop configuration path"""
        if self.system == "darwin":
            return Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"
        elif self.system == "windows":
            return Path(os.environ.get("APPDATA", "")) / "Claude" / "claude_desktop_config.json"
        elif self.system == "linux":
            return Path.home() / ".config" / "claude" / "claude_desktop_config.json"
        return None
    
    def create_base_config(self) -> Dict:
        """Create base MCP configuration"""
        return {
            "medical-ontology": {
                "command": "python",
                "args": ["-m", "medical_ontology_mcp.server"],
                "env": {
                    "DATA_PATH": str(self.project_root / "data"),
                    "LOG_LEVEL": "INFO",
                    "ENABLE_PREPROCESSING": "true",
                    "CACHE_SIZE": "1000"
                }
            }
        }
    
    def create_editor_specific_config(self, editor: str) -> Dict:
        """Create editor-specific configuration"""
        base_config = self.create_base_config()
        
        if editor == "claude_desktop":
            return {
                "mcpServers": base_config,
                "globalShortcut": "CommandOrControl+Shift+M"
            }
        elif editor == "vscode":
            config = {"mcpServers": base_config}
            config["mcpServers"]["medical-ontology"]["description"] = "Medical Ontology MCP Server"
            config["mcpServers"]["medical-ontology"]["icon"] = "🏥"
            return config
        elif editor == "cursor":
            return {"mcpServers": base_config}
        elif editor == "claude_code":
            return {
                "mcpServers": base_config,
                "metadata": {
                    "version": "1.0.0",
                    "description": "Medical Ontology MCP Server for clinical research",
                    "author": "Medical Informatics Research Team"
                }
            }
        else:
            return {"mcpServers": base_config}
    
    def configure_editor(self, editor: str) -> bool:
        """Configure MCP for a specific editor"""
        try:
            config_path = self.get_editor_config_path(editor)
            if not config_path:
                print(f"⚠️  Manual configuration required for {editor}")
                return False
            
            # Create directory if it doesn't exist
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Generate configuration
            config = self.create_editor_specific_config(editor)
            
            # Merge with existing configuration if it exists
            if config_path.exists():
                try:
                    with open(config_path, 'r') as f:
                        existing_config = json.load(f)
                    
                    # Merge configurations
                    if "mcpServers" in existing_config:
                        existing_config["mcpServers"].update(config.get("mcpServers", {}))
                    else:
                        existing_config.update(config)
                    
                    config = existing_config
                except (json.JSONDecodeError, KeyError):
                    print(f"⚠️  Warning: Could not merge with existing {editor} configuration")
            
            # Write configuration
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            print(f"✅ Configured MCP for {editor}: {config_path}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to configure {editor}: {e}")
            return False
    
    def configure_all(self) -> Dict[str, bool]:
        """Configure MCP for all detected editors"""
        print("🔍 Detecting editors and IDEs...")
        editors = self.detect_editors()
        
        if not editors:
            print("❌ No supported editors detected")
            return {}
        
        print(f"📝 Found editors: {', '.join(editors)}")
        
        results = {}
        for editor in editors:
            results[editor] = self.configure_editor(editor)
        
        return results
    
    def create_installation_script(self) -> str:
        """Create a shell script for easy installation"""
        script_content = f"""#!/bin/bash
# Medical Ontology MCP Installation Script
# Generated for project: {self.project_root.name}

set -e

echo "🏥 Medical Ontology MCP Setup"
echo "============================"

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt

# Run data preprocessing
echo "⚡ Preprocessing medical ontology data..."
python3 setup/preprocess_all.py ./data

# Configure MCP for detected editors
echo "🔧 Configuring MCP for detected editors..."
python3 setup/configure_mcp.py

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your editor/IDE"
echo "2. Look for the hammer (🔨) icon indicating MCP server is active"
echo "3. Try asking: 'What is the ICD-10 code for diabetes?'"
echo ""
echo "For troubleshooting, see: docs/TROUBLESHOOTING.md"
"""
        
        script_path = self.project_root / "install.sh"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        # Make executable
        os.chmod(script_path, 0o755)
        
        return str(script_path)
    
    def print_manual_instructions(self):
        """Print manual configuration instructions for unsupported editors"""
        print(f"""
📖 Manual Configuration Instructions
===================================

For editors that require manual setup, copy the appropriate configuration:

Windsurf IDE:
→ See: {self.project_root}/configs/windsurf_config.md

Other Editors:
→ Use the base configuration in: {self.project_root}/.mcp.json

Environment Variables:
- DATA_PATH: {self.project_root}/data
- LOG_LEVEL: INFO
- ENABLE_PREPROCESSING: true
""")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Auto-configure Medical Ontology MCP for detected editors"
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path.cwd(),
        help="Root directory of the medical ontology project"
    )
    parser.add_argument(
        "--editor",
        choices=["claude_desktop", "claude_code", "vscode", "cursor", "windsurf"],
        help="Configure for specific editor only"
    )
    parser.add_argument(
        "--create-install-script",
        action="store_true",
        help="Create installation script"
    )
    
    args = parser.parse_args()
    
    configurator = MCPConfigurator(args.project_root)
    
    if args.create_install_script:
        script_path = configurator.create_installation_script()
        print(f"📜 Created installation script: {script_path}")
        return
    
    if args.editor:
        # Configure specific editor
        success = configurator.configure_editor(args.editor)
        if success:
            print(f"✅ Successfully configured {args.editor}")
        else:
            print(f"❌ Failed to configure {args.editor}")
            sys.exit(1)
    else:
        # Configure all detected editors
        results = configurator.configure_all()
        
        if not results:
            print("❌ No editors configured")
            sys.exit(1)
        
        # Print summary
        successful = sum(results.values())
        total = len(results)
        
        print(f"\\n📊 Configuration Summary")
        print(f"========================")
        print(f"✅ Successful: {successful}/{total}")
        
        for editor, success in results.items():
            status = "✅" if success else "❌"
            print(f"{status} {editor}")
        
        # Print manual instructions for unsupported editors
        configurator.print_manual_instructions()
        
        if successful > 0:
            print("\\n🚀 Setup complete! Restart your editor to use Medical Ontology MCP.")
        else:
            print("\\n⚠️  Manual configuration may be required. See documentation.")


if __name__ == "__main__":
    main()