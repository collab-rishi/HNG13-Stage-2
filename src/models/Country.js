'use strict';
const { Model } = require('sequelize');

module.exports =  (sequelize, DataTypes) => {
  const Country = sequelize.define("Country", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
      unique: true
    },
    capital: DataTypes.STRING,
    region: DataTypes.STRING,
    population: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { isInt: true },
    },
    currency_code: DataTypes.STRING,
    exchange_rate: DataTypes.DECIMAL(15, 4),
    estimated_gdp: DataTypes.DECIMAL(20, 2),
    flag_url: DataTypes.TEXT,
    last_refreshed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "CountriesNew"
  });

  return Country;
};
