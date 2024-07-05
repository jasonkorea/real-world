const mongoose = require('mongoose');
const Unit = require('../models/unit');
const User = require('../models/user');

exports.createOrUpdateUnit = async (unit) => {
    try {
        const user = await User.findOne({ googleId: unit.sender });
        if (!user) {
            console.log('사용자를 찾을 수 없습니다.');
            throw new Error('사용자를 찾을 수 없습니다.');
        }
        console.log('사용자를 찾았습니다.');
        console.log(user);

        let existingUnit = await Unit.findOne({ id: unit.sender });
        if (existingUnit) {
            // 기존 유닛의 프로퍼티를 업데이트합니다.
            existingUnit.size = unit.unitInfo.size;
            existingUnit.speed = unit.unitInfo.speed;
            existingUnit.image = unit.unitInfo.image;
            existingUnit.startPosition = unit.unitInfo.startPosition;
            existingUnit.destinationPosition = unit.unitInfo.destinationPosition;
            existingUnit.startTime = unit.unitInfo.startTime;
            // 업데이트된 유닛을 저장합니다.
            await existingUnit.save();
            console.log('유닛이 업데이트되었습니다.');
        } else {
            // 새 유닛을 생성합니다.
            const newUnit = new Unit({
                id: unit.sender,
                size: unit.unitInfo.size,
                speed: unit.unitInfo.speed,
                image: unit.unitInfo.image,
                startPosition: unit.unitInfo.startPosition,
                destinationPosition: unit.unitInfo.destinationPosition,
                startTime: unit.unitInfo.startTime
            });
            await newUnit.save();
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