'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CountriesNew', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      capital: {
        type: Sequelize.STRING
      },
      region: {
        type: Sequelize.STRING
      },
      population: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      currency_code: {
        type: Sequelize.STRING
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(15, 4)
      },
      estimated_gdp: {
        type: Sequelize.DECIMAL(20, 2)
      },
      flag_url: {
        type: Sequelize.TEXT
      },
      last_refreshed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CountriesNew');
  }
};
