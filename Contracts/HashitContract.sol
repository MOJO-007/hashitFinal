// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DocumentZKPStorage
 * @dev Final version including a hash of the original, unencrypted file for verification.
 */
contract DocumentZKPStorage {
    struct Document {
        string ipfsCID;           // CID of the stored file (which could be encrypted)
        bytes32 zkpCommitmentHash;
        address uploader;
        bool isEncrypted;
        bytes32 originalFileHash; // [NEW] Hash of the unencrypted source file
    }

    mapping(uint256 => Document) public documents;
    mapping(bytes32 => uint256) public cidToDocumentId;
    mapping(address => uint256[]) public documentIdsByUser;
    
    // [NEW] Mapping to look up a document by its original file hash
    mapping(bytes32 => uint256) public originalHashToDocumentId;

    uint256 public nextDocumentId = 1;

    event DocumentAdded(
        uint256 indexed documentId,
        string ipfsCID,
        bytes32 zkpCommitmentHash,
        address indexed uploader,
        bool isEncrypted,
        bytes32 originalFileHash // [NEW]
    );

    function addDocument(
        string memory _ipfsCID,
        bytes32 _zkpCommitmentHash,
        bool _isEncrypted,
        bytes32 _originalFileHash // [NEW]
    ) public {
        require(bytes(_ipfsCID).length > 0, "IPFS CID cannot be empty");
        require(_originalFileHash != bytes32(0), "Original file hash cannot be empty");

        // [NEW] Prevent duplicate uploads of the same original file
        require(originalHashToDocumentId[_originalFileHash] == 0, "This original file has already been registered.");

        uint256 docId = nextDocumentId;

        documents[docId] = Document({
            ipfsCID: _ipfsCID,
            zkpCommitmentHash: _zkpCommitmentHash,
            uploader: msg.sender,
            isEncrypted: _isEncrypted,
            originalFileHash: _originalFileHash // [NEW]
        });

        bytes32 cidHash = keccak256(abi.encodePacked(_ipfsCID));
        cidToDocumentId[cidHash] = docId;
        originalHashToDocumentId[_originalFileHash] = docId; // [NEW]
        documentIdsByUser[msg.sender].push(docId);

        emit DocumentAdded(
            docId,
            _ipfsCID,
            _zkpCommitmentHash,
            msg.sender,
            _isEncrypted,
            _originalFileHash // [NEW]
        );
        
        nextDocumentId++;
    }

    function getDocumentByOriginalHash(bytes32 _originalFileHash)
        public
        view
        returns (Document memory)
    {
        uint256 docId = originalHashToDocumentId[_originalFileHash];
        require(docId != 0, "No document found for this original file hash.");
        return documents[docId];
    }
    
    // ... other getter functions remain the same ...
    function getDocumentsByUploader(address _uploader) public view returns (uint256[] memory) {
        return documentIdsByUser[_uploader];
    }
}