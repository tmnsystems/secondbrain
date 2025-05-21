import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Logger } from '../logging/logger';

/**
 * Interface for Grafana datasource
 */
export interface GrafanaDatasource {
  id?: number;
  uid?: string;
  orgId?: number;
  name: string;
  type: string;
  typeName?: string;
  access: string;
  url: string;
  password?: string;
  user?: string;
  database?: string;
  basicAuth?: boolean;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  withCredentials?: boolean;
  isDefault?: boolean;
  jsonData?: any;
  secureJsonData?: any;
  version?: number;
  readOnly?: boolean;
}

/**
 * Interface for Grafana folder
 */
export interface GrafanaFolder {
  id?: number;
  uid?: string;
  title: string;
  url?: string;
  hasAcl?: boolean;
  canSave?: boolean;
  canEdit?: boolean;
  canAdmin?: boolean;
  createdBy?: string;
  created?: string;
  updatedBy?: string;
  updated?: string;
  version?: number;
}

/**
 * Interface for Grafana user
 */
export interface GrafanaUser {
  id?: number;
  email: string;
  name?: string;
  login?: string;
  password?: string;
  isAdmin?: boolean;
}

/**
 * Interface for Grafana team
 */
export interface GrafanaTeam {
  id?: number;
  name: string;
  email?: string;
  orgId?: number;
  memberCount?: number;
}

/**
 * Service for managing Grafana resources including dashboards, datasources, users, and teams
 */
export class GrafanaService {
  private grafanaUrl: string;
  private grafanaApiKey: string;
  private logger: Logger;

  /**
   * Creates a new Grafana service instance
   * 
   * @param {string} grafanaUrl - Grafana API URL (default: http://localhost:3000)
   * @param {string} grafanaApiKey - Grafana API key
   * @param {Logger} logger - Logger instance
   */
  constructor(
    grafanaUrl: string = 'http://localhost:3000',
    grafanaApiKey: string = process.env.GRAFANA_API_KEY || '',
    logger: Logger
  ) {
    this.grafanaUrl = grafanaUrl;
    this.grafanaApiKey = grafanaApiKey;
    this.logger = logger;
  }

  /**
   * Gets the Grafana API headers
   * 
   * @returns {Record<string, string>} Headers
   * @private
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.grafanaApiKey}`
    };
  }

  /**
   * Creates or updates a datasource in Grafana
   * 
   * @param {GrafanaDatasource} datasource - Datasource configuration
   * @returns {Promise<string>} Datasource UID
   */
  async createOrUpdateDatasource(datasource: GrafanaDatasource): Promise<string> {
    try {
      this.logger.info(`Creating/updating datasource: ${datasource.name}`);
      
      // Check if datasource exists
      const existingDatasources = await this.getDatasources();
      const existingDatasource = existingDatasources.find(ds => ds.name === datasource.name);
      
      let response;
      
      if (existingDatasource) {
        // Update existing datasource
        response = await axios.put(
          `${this.grafanaUrl}/api/datasources/${existingDatasource.id}`,
          datasource,
          { headers: this.getHeaders() }
        );
      } else {
        // Create new datasource
        response = await axios.post(
          `${this.grafanaUrl}/api/datasources`,
          datasource,
          { headers: this.getHeaders() }
        );
      }
      
      this.logger.info(`Datasource created/updated: ${datasource.name}`);
      return response.data.datasource?.uid || response.data.uid;
    } catch (error) {
      this.logger.error(`Failed to create/update datasource: ${datasource.name}`, { error });
      throw new Error(`Failed to create/update datasource: ${error.message}`);
    }
  }

  /**
   * Gets all datasources from Grafana
   * 
   * @returns {Promise<GrafanaDatasource[]>} Datasources
   */
  async getDatasources(): Promise<GrafanaDatasource[]> {
    try {
      this.logger.info('Getting datasources');
      
      const response = await axios.get(
        `${this.grafanaUrl}/api/datasources`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Retrieved ${response.data.length} datasources`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get datasources', { error });
      throw new Error(`Failed to get datasources: ${error.message}`);
    }
  }

  /**
   * Deletes a datasource from Grafana
   * 
   * @param {string} name - Datasource name
   * @returns {Promise<void>}
   */
  async deleteDatasource(name: string): Promise<void> {
    try {
      this.logger.info(`Deleting datasource: ${name}`);
      
      // Get datasource ID by name
      const datasources = await this.getDatasources();
      const datasource = datasources.find(ds => ds.name === name);
      
      if (!datasource) {
        this.logger.warn(`Datasource not found: ${name}`);
        return;
      }
      
      await axios.delete(
        `${this.grafanaUrl}/api/datasources/${datasource.id}`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Datasource deleted: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to delete datasource: ${name}`, { error });
      throw new Error(`Failed to delete datasource: ${error.message}`);
    }
  }

  /**
   * Creates a folder in Grafana
   * 
   * @param {GrafanaFolder} folder - Folder configuration
   * @returns {Promise<string>} Folder UID
   */
  async createFolder(folder: GrafanaFolder): Promise<string> {
    try {
      this.logger.info(`Creating folder: ${folder.title}`);
      
      const response = await axios.post(
        `${this.grafanaUrl}/api/folders`,
        folder,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Folder created: ${folder.title}`);
      return response.data.uid;
    } catch (error) {
      this.logger.error(`Failed to create folder: ${folder.title}`, { error });
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Gets all folders from Grafana
   * 
   * @returns {Promise<GrafanaFolder[]>} Folders
   */
  async getFolders(): Promise<GrafanaFolder[]> {
    try {
      this.logger.info('Getting folders');
      
      const response = await axios.get(
        `${this.grafanaUrl}/api/folders`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Retrieved ${response.data.length} folders`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get folders', { error });
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  /**
   * Deletes a folder from Grafana
   * 
   * @param {string} uid - Folder UID
   * @returns {Promise<void>}
   */
  async deleteFolder(uid: string): Promise<void> {
    try {
      this.logger.info(`Deleting folder: ${uid}`);
      
      await axios.delete(
        `${this.grafanaUrl}/api/folders/${uid}`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Folder deleted: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to delete folder: ${uid}`, { error });
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  /**
   * Creates or updates a user in Grafana
   * 
   * @param {GrafanaUser} user - User configuration
   * @returns {Promise<number>} User ID
   */
  async createOrUpdateUser(user: GrafanaUser): Promise<number> {
    try {
      this.logger.info(`Creating/updating user: ${user.email}`);
      
      // Check if user exists
      const existingUsers = await this.getUsers();
      const existingUser = existingUsers.find(u => u.email === user.email);
      
      let response;
      
      if (existingUser) {
        // Update existing user
        response = await axios.put(
          `${this.grafanaUrl}/api/users/${existingUser.id}`,
          user,
          { headers: this.getHeaders() }
        );
      } else {
        // Create new user
        response = await axios.post(
          `${this.grafanaUrl}/api/admin/users`,
          user,
          { headers: this.getHeaders() }
        );
      }
      
      this.logger.info(`User created/updated: ${user.email}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create/update user: ${user.email}`, { error });
      throw new Error(`Failed to create/update user: ${error.message}`);
    }
  }

  /**
   * Gets all users from Grafana
   * 
   * @returns {Promise<GrafanaUser[]>} Users
   */
  async getUsers(): Promise<GrafanaUser[]> {
    try {
      this.logger.info('Getting users');
      
      const response = await axios.get(
        `${this.grafanaUrl}/api/users`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Retrieved ${response.data.length} users`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get users', { error });
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Deletes a user from Grafana
   * 
   * @param {number} id - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(id: number): Promise<void> {
    try {
      this.logger.info(`Deleting user: ${id}`);
      
      await axios.delete(
        `${this.grafanaUrl}/api/admin/users/${id}`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`User deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${id}`, { error });
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Creates a team in Grafana
   * 
   * @param {GrafanaTeam} team - Team configuration
   * @returns {Promise<number>} Team ID
   */
  async createTeam(team: GrafanaTeam): Promise<number> {
    try {
      this.logger.info(`Creating team: ${team.name}`);
      
      const response = await axios.post(
        `${this.grafanaUrl}/api/teams`,
        team,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Team created: ${team.name}`);
      return response.data.teamId;
    } catch (error) {
      this.logger.error(`Failed to create team: ${team.name}`, { error });
      throw new Error(`Failed to create team: ${error.message}`);
    }
  }

  /**
   * Gets all teams from Grafana
   * 
   * @returns {Promise<GrafanaTeam[]>} Teams
   */
  async getTeams(): Promise<GrafanaTeam[]> {
    try {
      this.logger.info('Getting teams');
      
      const response = await axios.get(
        `${this.grafanaUrl}/api/teams/search`,
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`Retrieved ${response.data.teams.length} teams`);
      return response.data.teams;
    } catch (error) {
      this.logger.error('Failed to get teams', { error });
      throw new Error(`Failed to get teams: ${error.message}`);
    }
  }

  /**
   * Adds a user to a team in Grafana
   * 
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async addUserToTeam(teamId: number, userId: number): Promise<void> {
    try {
      this.logger.info(`Adding user ${userId} to team ${teamId}`);
      
      await axios.post(
        `${this.grafanaUrl}/api/teams/${teamId}/members`,
        { userId },
        { headers: this.getHeaders() }
      );
      
      this.logger.info(`User ${userId} added to team ${teamId}`);
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to team ${teamId}`, { error });
      throw new Error(`Failed to add user to team: ${error.message}`);
    }
  }

  /**
   * Sets up standard Grafana resources for an application
   * 
   * @param {string} appName - Application name
   * @param {Object} config - Configuration
   * @returns {Promise<void>}
   */
  async setupStandardResources(
    appName: string,
    config: {
      prometheusUrl?: string;
      lokiUrl?: string;
      jaegerUrl?: string;
      teams?: string[];
      users?: { email: string; name?: string; isAdmin?: boolean }[];
    } = {}
  ): Promise<void> {
    try {
      this.logger.info(`Setting up standard Grafana resources for: ${appName}`);
      
      const {
        prometheusUrl = 'http://prometheus:9090',
        lokiUrl = 'http://loki:3100',
        jaegerUrl = 'http://jaeger:16686',
        teams = [],
        users = []
      } = config;
      
      // Create folder
      const folderTitle = `${appName} Dashboards`;
      
      const folders = await this.getFolders();
      
      let folderUid: string;
      const existingFolder = folders.find(f => f.title === folderTitle);
      
      if (existingFolder) {
        folderUid = existingFolder.uid!;
      } else {
        folderUid = await this.createFolder({ title: folderTitle });
      }
      
      // Set up datasources
      await this.createOrUpdateDatasource({
        name: 'prometheus',
        type: 'prometheus',
        access: 'proxy',
        url: prometheusUrl,
        isDefault: true
      });
      
      await this.createOrUpdateDatasource({
        name: 'loki',
        type: 'loki',
        access: 'proxy',
        url: lokiUrl
      });
      
      await this.createOrUpdateDatasource({
        name: 'jaeger',
        type: 'jaeger',
        access: 'proxy',
        url: jaegerUrl
      });
      
      // Create users
      const userIds: number[] = [];
      
      for (const user of users) {
        const userId = await this.createOrUpdateUser({
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        });
        
        userIds.push(userId);
      }
      
      // Create teams
      for (const teamName of teams) {
        const teamId = await this.createTeam({
          name: teamName
        });
        
        // Add all users to the team
        for (const userId of userIds) {
          await this.addUserToTeam(teamId, userId);
        }
      }
      
      this.logger.info(`Standard Grafana resources set up for: ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to set up standard Grafana resources for: ${appName}`, { error });
      throw new Error(`Failed to set up standard Grafana resources: ${error.message}`);
    }
  }
}