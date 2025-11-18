#!/usr/bin/env python3
"""
Script to merge PSBA HR User Manual files into a single comprehensive document.
"""

import os
from pathlib import Path

def merge_manual_files():
    """Merge all user manual markdown files into one comprehensive document."""
    
    # Output file name
    output_file = "PSBA_HR_User_Manual_Complete.md"
    
    # List of manual files in order
    manual_files = [
        "PSBA_HR_User_Manual_01_Introduction.md",
        "PSBA_HR_User_Manual_02_Employee_Management.md",
        "PSBA_HR_User_Manual_03_Attendance_Management.md",
        "PSBA_HR_User_Manual_04_Leave_Management.md",
        "PSBA_HR_User_Manual_05_Travel_Management.md",
        "PSBA_HR_User_Manual_06_Duty_Roster.md",
        "PSBA_HR_User_Manual_07_Settings.md",
        "PSBA_HR_User_Manual_08_Roles_and_Permissions.md"
    ]
    
    # Check if all files exist
    missing_files = []
    for file_name in manual_files:
        if not os.path.exists(file_name):
            missing_files.append(file_name)
    
    if missing_files:
        print(f"Error: The following files are missing:")
        for file in missing_files:
            print(f"  - {file}")
        return False
    
    # Create output content
    output_content = []
    
    # Add header
    output_content.append("# PSBA HR Management System - Complete User Manual\n")
    output_content.append("---\n")
    output_content.append("\n")
    output_content.append("**PSBA HR Management System**")
    output_content.append("\n")
    output_content.append("Comprehensive User Guide for End Users")
    output_content.append("\n")
    output_content.append("---\n")
    output_content.append("\n")
    
    # Add table of contents
    output_content.append("## Table of Contents\n")
    output_content.append("\n")
    output_content.append("1. [Introduction and Getting Started](#part-1-introduction-and-getting-started)\n")
    output_content.append("2. [Employee Management](#part-2-employee-management)\n")
    output_content.append("3. [Attendance Management](#part-3-attendance-management)\n")
    output_content.append("4. [Leave Management](#part-4-leave-management)\n")
    output_content.append("5. [Travel Management](#part-5-travel-management)\n")
    output_content.append("6. [Duty Roster Management](#part-6-duty-roster-management)\n")
    output_content.append("7. [Settings and Configuration](#part-7-settings-and-configuration)\n")
    output_content.append("8. [User Roles and Permissions Reference](#part-8-user-roles-and-permissions-reference)\n")
    output_content.append("\n")
    output_content.append("---\n")
    output_content.append("\n")
    
    # Read and append each file
    for idx, file_name in enumerate(manual_files, 1):
        print(f"Reading {file_name}...")
        
        try:
            with open(file_name, 'r', encoding='utf-8') as file:
                content = file.read()
                
                # Add section separator between parts (except for the first one)
                if idx > 1:
                    output_content.append("\n\n")
                    output_content.append("---\n")
                    output_content.append("\n")
                
                # Append content
                output_content.append(content)
                
                # Add separator after each part
                output_content.append("\n\n")
                output_content.append("---\n")
                
        except Exception as e:
            print(f"Error reading {file_name}: {str(e)}")
            return False
    
    # Write the complete manual to output file
    print(f"\nWriting complete manual to {output_file}...")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as output:
            output.write(''.join(output_content))
        
        print(f"\n[SUCCESS] Successfully created: {output_file}")
        
        # Get file size
        file_size = os.path.getsize(output_file)
        file_size_kb = file_size / 1024
        
        print(f"[INFO] Total size: {file_size_kb:.2f} KB")
        print(f"\nThe complete user manual is now ready for distribution.")
        
        return True
        
    except Exception as e:
        print(f"Error writing output file: {str(e)}")
        return False


def main():
    """Main function to run the merge script."""
    print("=" * 60)
    print("PSBA HR User Manual Merger")
    print("=" * 60)
    print()
    
    if merge_manual_files():
        print("\n[SUCCESS] Merge completed successfully!")
    else:
        print("\n[ERROR] Merge failed. Please check the errors above.")


if __name__ == "__main__":
    main()

