const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const User = require('../models/user');
const Decimal128 = mongoose.Types.Decimal128;

exports.createOrUpdateUnit = async (unit) => {
    try {

        const user = await User.findOne({ googleId: unit.sender });
        if (!user) {
            console.log('사용자를 찾을 수 없습니다.');
            throw new Error('사용자를 찾을 수 없습니다.');
        }
        console.log('사용자를 찾았습니다.');
        console.log(user);


        //let existingUnit = await Unit.findOne({ id: unit.sender });
        let existingUnit = user.unit ? await Unit.findById(user.unit) : null;
        if (existingUnit) {
            console.log(`유닛을 찾았습니다. startTime : ${unit.unitInfo.startTime}`);
            existingUnit.size = unit.unitInfo.size;
            existingUnit.speed = unit.unitInfo.speed;
            existingUnit.image = unit.unitInfo.image;
            existingUnit.startPosition = unit.unitInfo.startPosition;
            existingUnit.destinationPosition = unit.unitInfo.destinationPosition;
            existingUnit.startTime = Date.now();
            //현재 시간과 startTime을 함께 출력
            console.log('현재 시간:', Date.now());
            console.log('startTime:', existingUnit.startTime);
            // if (unit.unitInfo.startTime) {
            //     existingUnit.startTime = unit.unitInfo.startTime;
            // } else {
            //     existingUnit.startTime = Date.now();
            // }
            // 업데이트된 유닛을 저장합니다.
            console.log('유닛을 저장합니다.');
            await existingUnit.save();
            console.log('유닛이 업데이트되었습니다.');
        } else {
            // 새 유닛을 생성합니다.
            console.log('유닛을 찾지 못했습니다. 새로 생성합니다. sender :', unit.sender);
            console.log('unit:', unit);
            const newUnit = new Unit({
                id: unit.sender,
                size: unit.unitInfo.size,
                speed: unit.unitInfo.speed,
                image: unit.unitInfo.image,
                startPosition: unit.unitInfo.startPosition,
                destinationPosition: unit.unitInfo.destinationPosition,
                startTime: unit.unitInfo.startTime
            });
            // show newUnit
            console.log('newUnit:', newUnit);

            await newUnit.save();

            //print all units
            const units = await Unit.find();
            console.log('units:', units);

            user.unit = newUnit._id;
            await user.save();
            console.log('유닛이 생성되었습니다.');
            existingUnit = newUnit;
        }
        return existingUnit;
    } catch (error) {
        console.error(error);
        throw error; // 호출자가 처리할 수 있도록 오류를 다시 던집니다.
    }
}

exports.getAllUnits = async () => {
    try {
        const units = await Unit.find();
        return units;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

//clear all units
exports.clearAllUnits = async () => {
    try {
        await Unit.deleteMany({});
    } catch (error) {
        console.error(error);
        throw error;
    }
}