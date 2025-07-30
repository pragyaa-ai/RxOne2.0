# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-19

### Added
- **17 Comprehensive Data Points**: Expanded data collection from 8 to 17 store verification points
  - Store ID/Code, Address Line 1, Locality, Landmark, City, State, PIN Code
  - Business Hours, Weekly Off
  - Main Phone Number with STD, Store Manager's Number, Alternate Number  
  - Store Email ID, Store Manager's Email ID, Designation of Person
  - Parking Options, Payment Methods Accepted

- **Mandatory Confirmation Protocol**: 3-step verification process
  - Immediate data capture using `capture_store_data` tool
  - Immediate read-back confirmation to customer
  - Wait for explicit confirmation before proceeding

- **Smart Escalation System**: Prevents infinite loops on difficult data points
  - Maximum 2 attempts per data point
  - Auto-escalation to human expert after 2 failed attempts
  - Continues conversation flow instead of getting stuck

- **Enhanced UI Components**:
  - Updated AgentVisualizer with 17 data point display
  - Appropriate icons for each data type
  - Real-time progress tracking
  - Updated demo buttons for testing

### Changed
- **DataCollectionContext**: Updated to handle 17 new data points
- **Agent Tools**: Enhanced `capture_store_data` and `verify_captured_data` with new data types
- **Agent Instructions**: Comprehensive confirmation and escalation protocols
- **UI Layout**: Professional data collection center with progress indicators

### Improved
- **Data Accuracy**: Confirmation protocol ensures 100% accurate captures
- **Conversation Flow**: Escalation system prevents agent from getting stuck
- **User Experience**: Smooth flow with expert fallback for complex cases
- **Business Value**: Complete store verification data for operations

### Technical
- Full TypeScript support for new data structure
- Backward compatibility maintained
- Enhanced error handling and validation
- Optimized state management for 17 data points

## [1.x.x] - Previous Versions

### Features
- Basic 8 data point collection system
- Simple capture functionality  
- Basic UI interface
- Core agent infrastructure 