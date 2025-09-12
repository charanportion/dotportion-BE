export class BaseProvider {
  constructor(logger) {
    if (this.constructor === BaseProvider) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.logger = logger;
  }

  async listCollections() {
    throw new Error("Method 'listCollections()' must be implemented.");
  }

  async getDocuments(collectionName, options) {
    throw new Error("Method 'getDocuments()' must be implemented.");
  }

  async createDocument(collectionName, data) {
    throw new Error("Method 'createDocument()' must be implemented.");
  }

  async updateDocument(collectionName, documentId, data) {
    throw new Error("Method 'updateDocument()' must be implemented.");
  }

  async deleteDocument(collectionName, documentId) {
    throw new Error("Method 'deleteDocument()' must be implemented.");
  }
}
